const POSITIONS = ["Arquero", "Defensa", "Medio", "Delantero"];
const FIELD_POSITIONS = ["Defensa", "Medio", "Delantero"];
const PITCH_LINES = ["Delantero", "Medio", "Defensa", "Arquero"];
const TEAM_KEYS = ["A", "B"];
const TEAM_COLORS = {
  A: "#c83e3e",
  B: "#2368b5"
};
const FORMATION_PRESETS = {
  1: ["1-0-0", "0-1-0", "0-0-1"],
  2: ["1-0-1", "1-1-0", "0-1-1"],
  3: ["1-1-1", "2-0-1", "1-2-0"],
  4: ["1-2-1", "2-1-1", "1-1-2", "2-2-0"],
  5: ["2-2-1", "2-1-2", "1-3-1", "3-1-1"],
  6: ["2-2-2", "3-2-1", "2-3-1", "1-3-2"],
  7: ["2-3-2", "3-2-2", "2-4-1", "3-3-1"],
  8: ["3-3-2", "3-4-1", "2-4-2", "4-3-1"],
  9: ["3-4-2", "4-3-2", "3-3-3", "4-4-1"],
  10: ["4-4-2", "4-5-1", "3-5-2", "4-3-3"]
};
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
  dayListForm: $("#dayListForm"),
  dayListText: $("#dayListText"),
  dayListFeedback: $("#dayListFeedback"),
  availableGrid: $("#availableGrid"),
  availableFeedback: $("#availableFeedback"),
  markAllBtn: $("#markAllBtn"),
  clearAvailableBtn: $("#clearAvailableBtn"),
  removeDuplicatePlayersBtn: $("#removeDuplicatePlayersBtn"),
  constraintForm: $("#constraintForm"),
  constraintPlayerA: $("#constraintPlayerA"),
  constraintPlayerB: $("#constraintPlayerB"),
  constraintType: $("#constraintType"),
  constraintList: $("#constraintList"),
  swapTeamsForm: $("#swapTeamsForm"),
  swapPlayerA: $("#swapPlayerA"),
  swapPlayerB: $("#swapPlayerB"),
  finalFormationBtn: $("#finalFormationBtn"),
  finalFormationPanel: $("#finalFormationPanel"),
  finalFormationOutput: $("#finalFormationOutput"),
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
    constraints: [],
    results: []
  };

  try {
    const loadedState = { ...fallback, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
    loadedState.players = (loadedState.players || []).map((player) => ({
      ...player,
      name: sanitizePlayerName(player.name)
    }));
    return normalizeRosterState(loadedState);
  } catch {
    return fallback;
  }
}

function saveState() {
  normalizeRosterState(state);
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
  return String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sanitizePlayerName(value) {
  return String(value || "")
    .trim()
    .replace(/^(?:\d+[\.)]|[-*\u2022])\s*/, "")
    .replace(/^\d+\s+(?=\D)/, "")
    .trim();
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
        name: sanitizePlayerName(parts[0]),
        rating: hasRating ? rawRating : 3,
        positions: parsePositions(positionsText)
      };
    })
    .filter((player) => player.name);
}

function lineHasPlayerDetails(line) {
  const parts = splitBulkLine(line).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;

  const rawRating = Number(parts[1]);
  const hasRating = Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5;
  return hasRating || parsePositions(parts.slice(1).join(",")).length > 0;
}

function parseDayList(text) {
  const names = [];
  const seenNames = new Set();
  let duplicateCount = 0;

  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const chunks = lineHasPlayerDetails(line) ? [splitBulkLine(line)[0]] : line.split(/[,\t;]|\s+-\s+/);

      chunks
        .map(sanitizePlayerName)
        .filter(Boolean)
        .forEach((name) => {
          const key = normalizeToken(name);
          if (seenNames.has(key)) {
            duplicateCount += 1;
            return;
          }

          seenNames.add(key);
          names.push(name);
        });
    });

  return { names, duplicateCount };
}

function uniquePlayersByName(players) {
  const seenNames = new Set();

  return players.filter((player) => {
    const key = normalizeToken(player.name);
    if (!key || seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
}

function duplicatePlayerCountByName(players) {
  const seenNames = new Set();
  let duplicateCount = 0;

  for (const player of players || []) {
    const key = normalizeToken(sanitizePlayerName(player?.name));
    if (!key) continue;
    if (seenNames.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seenNames.add(key);
  }

  return duplicateCount;
}

function normalizedPlayerPositions(positions) {
  const normalized = (Array.isArray(positions) ? positions : String(positions || "").split(/[,+/|]/))
    .map(normalizePosition)
    .filter(Boolean);

  return normalized.length ? [...new Set(normalized)] : ["Medio"];
}

function normalizedPlayerRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 3;
  return Math.min(Math.max(Math.round(rating), 1), 5);
}

function uniqueIds(ids) {
  const seenIds = new Set();
  return (ids || []).filter((id) => {
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

function normalizeRosterState(appState) {
  const playersByName = new Map();
  const idMap = new Map();
  const normalizedPlayers = [];

  for (const originalPlayer of appState.players || []) {
    if (!originalPlayer) continue;
    const player = {
      ...originalPlayer,
      id: originalPlayer.id || uid(),
      name: sanitizePlayerName(originalPlayer.name),
      rating: normalizedPlayerRating(originalPlayer.rating),
      positions: normalizedPlayerPositions(originalPlayer.positions),
      available: Boolean(originalPlayer.available)
    };
    const key = normalizeToken(player.name);
    if (!key) continue;

    const existingPlayer = playersByName.get(key);
    if (!existingPlayer) {
      playersByName.set(key, player);
      idMap.set(player.id, player.id);
      normalizedPlayers.push(player);
      continue;
    }

    idMap.set(player.id, existingPlayer.id);
    existingPlayer.rating = Math.max(existingPlayer.rating, player.rating);
    existingPlayer.positions = [...new Set([...existingPlayer.positions, ...player.positions])];
    existingPlayer.available = existingPlayer.available || player.available;
  }

  appState.players = normalizedPlayers;
  const validPlayerIds = new Set(normalizedPlayers.map((player) => player.id));
  const remapId = (id) => idMap.get(id) || id;
  const remapIdList = (ids) => uniqueIds((ids || []).map(remapId).filter((id) => validPlayerIds.has(id)));

  const seenConstraints = new Set();
  appState.constraints = (appState.constraints || [])
    .map((constraint) => ({
      ...constraint,
      playerA: remapId(constraint.playerA),
      playerB: remapId(constraint.playerB)
    }))
    .filter((constraint) => {
      if (
        !constraint.playerA ||
        !constraint.playerB ||
        constraint.playerA === constraint.playerB ||
        !validPlayerIds.has(constraint.playerA) ||
        !validPlayerIds.has(constraint.playerB)
      ) {
        return false;
      }

      const pairKey = [constraint.playerA, constraint.playerB].sort().join(":");
      if (seenConstraints.has(pairKey)) return false;
      seenConstraints.add(pairKey);
      return true;
    });

  if (appState.draw) {
    const originalTeamALength = (appState.draw.teamA || []).length;
    const originalTeamBLength = (appState.draw.teamB || []).length;
    const teamA = remapIdList(appState.draw.teamA);
    const teamB = remapIdList(appState.draw.teamB);
    const teamAIds = new Set(teamA);
    const hasOverlap = teamB.some((id) => teamAIds.has(id));

    if (hasOverlap || teamA.length !== originalTeamALength || teamB.length !== originalTeamBLength) {
      appState.draw = null;
    } else {
      appState.draw.teamA = teamA;
      appState.draw.teamB = teamB;
      appState.draw.assignments = TEAM_KEYS.reduce((assignments, teamKey) => {
        const sourceAssignments = appState.draw.assignments?.[teamKey] || {};
        const teamIds = new Set(teamKey === "A" ? teamA : teamB);
        assignments[teamKey] = {};

        for (const [playerId, position] of Object.entries(sourceAssignments)) {
          const mappedId = remapId(playerId);
          if (teamIds.has(mappedId) && POSITIONS.includes(position)) {
            assignments[teamKey][mappedId] = position;
          }
        }

        return assignments;
      }, {});
    }
  }

  appState.results = (appState.results || []).map((result) => ({
    ...result,
    teamA: remapIdList(result.teamA),
    teamB: remapIdList(result.teamB)
  }));

  return appState;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function availablePlayers() {
  return uniquePlayersByName(state.players.filter((player) => player.available));
}

function activeConstraintIds(players = state.players) {
  const playerIds = new Set(players.map((player) => player.id));
  return new Set(
    (state.constraints || [])
      .filter((constraint) => playerIds.has(constraint.playerA) && playerIds.has(constraint.playerB))
      .flatMap((constraint) => [constraint.playerA, constraint.playerB])
  );
}

function selectedPlayersForDraw(players, needed) {
  const constrainedIds = activeConstraintIds(players);
  const constrainedPlayers = players.filter((player) => constrainedIds.has(player.id));

  if (constrainedPlayers.length > needed) {
    throw new Error(
      `Hay ${constrainedPlayers.length} jugadores en condiciones activas, pero el partido solo necesita ${needed}.`
    );
  }

  const selectedIds = new Set(constrainedPlayers.map((player) => player.id));
  const orderedPlayers = players.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const selected = [...constrainedPlayers];

  for (const player of orderedPlayers) {
    if (selected.length >= needed) break;
    if (selectedIds.has(player.id)) continue;
    selectedIds.add(player.id);
    selected.push(player);
  }

  return selected.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
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

function keeperSlotsForSize(size) {
  return size >= 4 ? 1 : 0;
}

function fieldersForSize(size) {
  return Math.max(size - keeperSlotsForSize(size), 0);
}

function parseFormationLabel(label) {
  const [defense = 0, midfield = 0, attack = 0] = String(label)
    .split("-")
    .map((part) => Number(part));

  return {
    Defensa: Number.isFinite(defense) ? defense : 0,
    Medio: Number.isFinite(midfield) ? midfield : 0,
    Delantero: Number.isFinite(attack) ? attack : 0
  };
}

function formationSum(label) {
  const parsed = parseFormationLabel(label);
  return parsed.Defensa + parsed.Medio + parsed.Delantero;
}

function fallbackFormation(fielders) {
  if (!fielders) return "0-0-0";
  if (fielders === 1) return "1-0-0";

  const defense = Math.max(1, Math.round(fielders * 0.36));
  const midfield = Math.max(1, Math.round(fielders * 0.38));
  const attack = Math.max(1, fielders - defense - midfield);
  return `${defense}-${midfield}-${attack}`;
}

function formationOptionsForSize(size) {
  const fielders = fieldersForSize(size);
  const options = FORMATION_PRESETS[fielders] || [fallbackFormation(fielders)];
  const validOptions = options.filter((option) => formationSum(option) === fielders);

  return [...new Set(validOptions.length ? validOptions : [fallbackFormation(fielders)])];
}

function defaultFormationForTeam(team) {
  return formationOptionsForSize(team.length)[0];
}

function getDrawTeamIds(teamKey) {
  return teamKey === "A" ? state.draw?.teamA || [] : state.draw?.teamB || [];
}

function pruneTeamAssignments(teamKey, team) {
  if (!state.draw?.assignments?.[teamKey]) return;
  const teamIds = new Set(team.map((player) => player.id));
  const assignments = state.draw.assignments[teamKey];

  for (const playerId of Object.keys(assignments)) {
    if (!teamIds.has(playerId) || !POSITIONS.includes(assignments[playerId])) {
      delete assignments[playerId];
    }
  }
}

function ensureDrawTactics(teamA, teamB) {
  if (!state.draw) return;
  state.draw.formations = state.draw.formations || {};
  state.draw.assignments = state.draw.assignments || {};
  state.draw.keeperVacant = state.draw.keeperVacant || {};

  for (const teamKey of TEAM_KEYS) {
    const team = teamKey === "A" ? teamA : teamB;
    const options = formationOptionsForSize(team.length);

    if (!options.includes(state.draw.formations[teamKey])) {
      state.draw.formations[teamKey] = defaultFormationForTeam(team);
    }

    state.draw.assignments[teamKey] = state.draw.assignments[teamKey] || {};
    state.draw.keeperVacant[teamKey] = Boolean(state.draw.keeperVacant[teamKey]);
    pruneTeamAssignments(teamKey, team);
  }
}

function formationTargets(team, label) {
  const selected = parseFormationLabel(label || defaultFormationForTeam(team));

  return {
    Arquero: keeperSlotsForSize(team.length),
    Defensa: selected.Defensa,
    Medio: selected.Medio,
    Delantero: selected.Delantero
  };
}

function positionFitCost(player, position) {
  if (player.positions.includes(position)) return 0;

  const costs = {
    Arquero: { Defensa: 4, Medio: 5, Delantero: 6 },
    Defensa: { Arquero: 3, Medio: 2, Delantero: 4 },
    Medio: { Arquero: 4, Defensa: 2, Delantero: 2 },
    Delantero: { Arquero: 5, Defensa: 4, Medio: 2 }
  };
  const positionCosts = player.positions.map((playerPosition) => costs[position]?.[playerPosition] ?? 3);

  return positionCosts.length ? Math.min(...positionCosts) : 3;
}

function pickPlayerForPosition(players, position) {
  return players
    .slice()
    .sort(
      (a, b) =>
        positionFitCost(a, position) - positionFitCost(b, position) ||
        a.positions.length - b.positions.length ||
        Number(a.rating) - Number(b.rating) ||
        a.name.localeCompare(b.name)
    )[0];
}

function formationSlots(targets) {
  const slots = [];
  const maxLineSize = Math.max(...FIELD_POSITIONS.map((position) => targets[position]));

  for (let index = 0; index < maxLineSize; index += 1) {
    for (const position of FIELD_POSITIONS) {
      if (index < targets[position]) slots.push(position);
    }
  }

  return slots;
}

function lineWithMostRoom(buckets, targets, player) {
  return FIELD_POSITIONS.slice().sort((a, b) => {
    const roomA = targets[a] - buckets[a].length;
    const roomB = targets[b] - buckets[b].length;
    return roomB - roomA || positionFitCost(player, a) - positionFitCost(player, b);
  })[0];
}

function buildFormation(team, teamKey) {
  const selectedLabel = state.draw?.formations?.[teamKey] || defaultFormationForTeam(team);
  const targets = formationTargets(team, selectedLabel);
  const buckets = POSITIONS.reduce((result, position) => {
    result[position] = [];
    return result;
  }, {});
  const assigned = new Set();
  const assignments = state.draw?.assignments?.[teamKey] || {};
  const keeperVacant = Boolean(state.draw?.keeperVacant?.[teamKey]);

  for (const player of team) {
    const assignedPosition = assignments[player.id];
    if (!assignedPosition || !POSITIONS.includes(assignedPosition)) continue;
    buckets[assignedPosition].push(player);
    assigned.add(player.id);
  }

  if (targets.Arquero && !buckets.Arquero.length && !keeperVacant) {
    const keeper = pickPlayerForPosition(
      team.filter((player) => !assigned.has(player.id)),
      "Arquero"
    );
    if (keeper && !assigned.has(keeper.id)) {
      buckets.Arquero.push(keeper);
      assigned.add(keeper.id);
    }
  }

  for (const position of formationSlots(targets)) {
    const available = team.filter((player) => !assigned.has(player.id));
    if (!available.length) break;
    const player = pickPlayerForPosition(available, position);
    buckets[position].push(player);
    assigned.add(player.id);
  }

  for (const player of team.filter((candidate) => !assigned.has(candidate.id))) {
    buckets[lineWithMostRoom(buckets, targets, player)].push(player);
  }

  const actualLabel = FIELD_POSITIONS.map((position) => buckets[position].length).join("-");
  return { buckets, label: selectedLabel, actualLabel, targets };
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

function constraintsSatisfied(teamAIds, selectedIds) {
  for (const constraint of state.constraints || []) {
    if (!selectedIds.has(constraint.playerA) || !selectedIds.has(constraint.playerB)) continue;

    const playerAInTeamA = teamAIds.has(constraint.playerA);
    const playerBInTeamA = teamAIds.has(constraint.playerB);

    if (constraint.type === "same" && playerAInTeamA !== playerBInTeamA) return false;
    if (constraint.type === "apart" && playerAInTeamA === playerBInTeamA) return false;
  }

  return true;
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

  const selected = selectedPlayersForDraw(players, needed);
  const selectedIds = new Set(selected.map((player) => player.id));
  const allCombos = combinations(selected, teamSize);
  let best = null;

  for (const teamA of allCombos) {
    const teamAIds = new Set(teamA.map((player) => player.id));
    if (!constraintsSatisfied(teamAIds, selectedIds)) continue;

    const teamB = selected.filter((player) => !teamAIds.has(player.id));
    const score = drawScore(teamA, teamB, teamSize);
    const balance = Math.abs(teamTotal(teamA) - teamTotal(teamB));

    if (!best || score < best.score || (score === best.score && balance < best.balance)) {
      best = { teamA, teamB, score, balance };
    }
  }

  if (!best) {
    throw new Error("No hay un sorteo posible que cumpla todas las condiciones.");
  }

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    teamA: best.teamA.map((player) => player.id),
    teamB: best.teamB.map((player) => player.id),
    formations: {
      A: defaultFormationForTeam(best.teamA),
      B: defaultFormationForTeam(best.teamB)
    },
    assignments: {
      A: {},
      B: {}
    },
    keeperVacant: {
      A: false,
      B: false
    },
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

function replaceTeamPlayer(teamKey, outgoingId, incomingId) {
  const key = teamKey === "A" ? "teamA" : "teamB";
  state.draw[key] = state.draw[key].map((playerId) => (playerId === outgoingId ? incomingId : playerId));
}

function setPlayerAssignment(teamKey, playerId, position) {
  state.draw.assignments = state.draw.assignments || {};
  state.draw.assignments[teamKey] = state.draw.assignments[teamKey] || {};
  state.draw.assignments[teamKey][playerId] = position;
  if (position === "Arquero") setKeeperVacant(teamKey, false);
}

function removePlayerAssignment(teamKey, playerId) {
  if (state.draw?.assignments?.[teamKey]) delete state.draw.assignments[teamKey][playerId];
}

function setKeeperVacant(teamKey, value) {
  state.draw.keeperVacant = state.draw.keeperVacant || {};
  state.draw.keeperVacant[teamKey] = value;
}

function positionForPlayer(formation, playerId) {
  return POSITIONS.find((position) => formation.buckets[position].some((player) => player.id === playerId)) || "Medio";
}

function optionListForTeam(team) {
  if (!team.length) return `<option value="">Sin sorteo</option>`;

  return team.map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join("");
}

function swapPlayersAcrossTeams(playerAId, playerBId) {
  const { teamA, teamB } = drawTeams();
  ensureDrawTactics(teamA, teamB);

  if (!teamA.some((player) => player.id === playerAId) || !teamB.some((player) => player.id === playerBId)) {
    return false;
  }

  const formationA = buildFormation(teamA, "A");
  const formationB = buildFormation(teamB, "B");
  const playerAPosition = positionForPlayer(formationA, playerAId);
  const playerBPosition = positionForPlayer(formationB, playerBId);

  replaceTeamPlayer("A", playerAId, playerBId);
  replaceTeamPlayer("B", playerBId, playerAId);
  removePlayerAssignment("A", playerAId);
  removePlayerAssignment("B", playerBId);
  setPlayerAssignment("A", playerBId, playerAPosition);
  setPlayerAssignment("B", playerAId, playerBPosition);
  return true;
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

function nameEditor(player) {
  return `
    <input
      class="name-input"
      data-action="update-name"
      data-id="${player.id}"
      value="${escapeHtml(player.name)}"
      aria-label="Nombre de ${escapeHtml(player.name)}"
    />
  `;
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
          <td>${nameEditor(player)}</td>
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

  elements.availableGrid.innerHTML = uniquePlayersByName(state.players)
    .map(
      (player) => `
        <article class="player-card ${player.available ? "is-selected" : ""}">
          <header>
            <strong>${escapeHtml(player.name)}</strong>
            <span class="rating">${player.rating}/5</span>
          </header>
          ${playerPills(player)}
          <footer class="player-card-footer">
            <label class="switch">
              <input type="checkbox" data-action="toggle-player" data-id="${player.id}" ${player.available ? "checked" : ""} />
              Disponible
            </label>
            <button class="danger compact-button" type="button" data-action="delete-player" data-id="${player.id}">Quitar</button>
          </footer>
        </article>
      `
    )
    .join("");
}

function playerOptions(selectedId = "") {
  if (!state.players.length) return `<option value="">Sin jugadores</option>`;

  return state.players
    .map(
      (player) =>
        `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>`
    )
    .join("");
}

function constraintLabel(type) {
  return type === "apart" ? "equipos distintos" : "mismo equipo";
}

function renderConstraints() {
  elements.constraintPlayerA.innerHTML = playerOptions(state.players[0]?.id);
  elements.constraintPlayerB.innerHTML = playerOptions(state.players[1]?.id || state.players[0]?.id);

  const submitButton = elements.constraintForm.querySelector('button[type="submit"]');
  const disabled = state.players.length < 2;
  elements.constraintPlayerA.disabled = disabled;
  elements.constraintPlayerB.disabled = disabled;
  elements.constraintType.disabled = disabled;
  submitButton.disabled = disabled;

  if (!(state.constraints || []).length) {
    elements.constraintList.innerHTML = `<div class="empty">Sin condiciones para este sorteo.</div>`;
    return;
  }

  elements.constraintList.innerHTML = state.constraints
    .map((constraint) => {
      const playerA = getPlayer(constraint.playerA);
      const playerB = getPlayer(constraint.playerB);
      const isActive = Boolean(playerA?.available && playerB?.available);
      return `
        <div class="constraint-item">
          <span>
            <strong>${escapeHtml(playerA?.name || "Jugador eliminado")}</strong>
            ${constraintLabel(constraint.type)}
            <strong>${escapeHtml(playerB?.name || "Jugador eliminado")}</strong>
            <em>${isActive ? "Activa" : "Inactiva"}</em>
          </span>
          <button class="danger" type="button" data-action="delete-constraint" data-id="${constraint.id}">Quitar</button>
        </div>
      `;
    })
    .join("");
}

function renderTeamSwap() {
  const { teamA, teamB } = drawTeams();
  const disabled = !state.draw || !teamA.length || !teamB.length;

  elements.swapPlayerA.innerHTML = optionListForTeam(teamA);
  elements.swapPlayerB.innerHTML = optionListForTeam(teamB);
  elements.swapPlayerA.disabled = disabled;
  elements.swapPlayerB.disabled = disabled;
  elements.swapTeamsForm.querySelector('button[type="submit"]').disabled = disabled;
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

function renderFormationTools(teamKey, team, selectedLabel) {
  const options = formationOptionsForSize(team.length);
  const suggestions = options.slice(0, 4);

  return `
    <div class="formation-tools">
      <label>
        Formacion
        <select class="formation-select" data-action="update-formation" data-team="${teamKey}">
          ${options
            .map((option) => `<option value="${option}" ${option === selectedLabel ? "selected" : ""}>${option}</option>`)
            .join("")}
        </select>
      </label>
      <div class="formation-suggestions" aria-label="Formaciones sugeridas">
        ${suggestions
          .map(
            (option) => `
              <button
                class="suggestion-chip ${option === selectedLabel ? "is-active" : ""}"
                type="button"
                data-action="apply-formation"
                data-team="${teamKey}"
                data-formation="${option}"
              >
                ${option}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function jerseyNumber(player, team) {
  return team.findIndex((candidate) => candidate.id === player.id) + 1;
}

function renderJersey(player, team, teamKey, position) {
  return `
    <button
      class="player-token jersey team-${teamKey.toLowerCase()} ${position === "Arquero" ? "is-keeper" : ""}"
      type="button"
      draggable="true"
      data-action="move-player"
      data-team="${teamKey}"
      data-player-id="${player.id}"
      data-position="${position}"
      title="${escapeHtml(player.name)} - arrastra sobre otra camiseta para intercambiar"
    >
      <span class="jersey-number">${jerseyNumber(player, team)}</span>
      <span class="jersey-name">${escapeHtml(player.name)}</span>
    </button>
  `;
}

function renderPitchLine(position, formation, team, teamKey) {
  const players = formation.buckets[position];

  return `
    <div class="pitch-line pitch-line-${position}" data-drop-position="${position}" data-team="${teamKey}">
      <span class="line-label">${position}</span>
      <div class="line-players">
        ${
          players.length
            ? players.map((player) => renderJersey(player, team, teamKey, position)).join("")
            : `<span class="player-token is-empty">Libre</span>`
        }
      </div>
    </div>
  `;
}

function renderFormation(container, team, teamKey) {
  if (!team.length) {
    container.innerHTML = "";
    return null;
  }

  const formation = buildFormation(team, teamKey);
  const hasManualMoves = Object.keys(state.draw?.assignments?.[teamKey] || {}).length > 0;
  container.innerHTML = `
    <div class="formation-meta">
      <span>Formacion ${escapeHtml(formation.label)}</span>
      ${hasManualMoves ? `<span>Ajustada</span>` : ""}
    </div>
    ${renderFormationTools(teamKey, team, formation.label)}
    <div class="pitch" aria-label="Formacion del equipo">
      <span class="pitch-mark center-circle"></span>
      <span class="pitch-mark top-box"></span>
      <span class="pitch-mark bottom-box"></span>
      <span class="pitch-mark goal-box"></span>
      ${PITCH_LINES.map((position) => renderPitchLine(position, formation, team, teamKey)).join("")}
    </div>
  `;
  return formation;
}

function namesForLine(formation, position) {
  const names = formation.buckets[position].map((player) => player.name);
  return names.length ? names.join(", ") : "Libre";
}

function finalTeamText(teamName, team, teamKey) {
  const formation = buildFormation(team, teamKey);
  return [
    `${teamName} (${formation.actualLabel})`,
    `Arquero: ${namesForLine(formation, "Arquero")}`,
    `Defensa: ${namesForLine(formation, "Defensa")}`,
    `Medio: ${namesForLine(formation, "Medio")}`,
    `Delantero: ${namesForLine(formation, "Delantero")}`
  ].join("\n");
}

function finalFormationText() {
  const { teamA, teamB } = drawTeams();
  if (!state.draw || !teamA.length || !teamB.length) return "";
  ensureDrawTactics(teamA, teamB);

  return [
    `Jueves FC - ${state.match.date}`,
    state.match.place ? `Cancha: ${state.match.place}` : "Cancha: Por definir",
    "",
    finalTeamText("Equipo A", teamA, "A"),
    "",
    finalTeamText("Equipo B", teamB, "B")
  ].join("\n");
}

function distributeLineY(count, top, bottom) {
  if (count <= 1) return [(top + bottom) / 2];

  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, index) => top + step * index);
}

function shortText(ctx, text, maxWidth) {
  const value = String(text);
  if (ctx.measureText(value).width <= maxWidth) return value;

  let result = value;
  while (result.length > 2 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function drawLabel(ctx, text, x, y, maxWidth) {
  ctx.save();
  ctx.font = "30px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(shortText(ctx, text, maxWidth), x, y);
  ctx.restore();
}

function drawPlayerMarker(ctx, player, number, x, y, color, isKeeper) {
  drawLabel(ctx, player.name, x, y - 46, 180);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = isKeeper ? 8 : 4;
  ctx.strokeStyle = isKeeper ? "#f0c24b" : "rgba(0, 0, 0, 0.18)";
  ctx.stroke();

  ctx.font = "700 30px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(number, x, y + 1);
  ctx.restore();
}

function drawField(ctx, width, height) {
  const field = { x: 90, y: 80, width: width - 180, height: height - 160 };
  const stripeWidth = field.width / 12;

  ctx.fillStyle = "#6f7f54";
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < 12; index += 1) {
    ctx.fillStyle = index % 2 === 0 ? "#71a957" : "#5b9f45";
    ctx.fillRect(field.x + stripeWidth * index, field.y, stripeWidth + 1, field.height);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 4;
  ctx.strokeRect(field.x, field.y, field.width, field.height);

  const centerX = field.x + field.width / 2;
  const centerY = field.y + field.height / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, field.y);
  ctx.lineTo(centerX, field.y + field.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 175, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 2;
  ctx.stroke();

  const boxHeight = field.height * 0.58;
  const boxY = field.y + (field.height - boxHeight) / 2;
  const boxWidth = 295;
  const goalHeight = field.height * 0.32;
  const goalY = field.y + (field.height - goalHeight) / 2;
  const goalWidth = 105;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.lineWidth = 3;
  ctx.strokeRect(field.x, boxY, boxWidth, boxHeight);
  ctx.strokeRect(field.x, goalY, goalWidth, goalHeight);
  ctx.strokeRect(field.x + field.width - boxWidth, boxY, boxWidth, boxHeight);
  ctx.strokeRect(field.x + field.width - goalWidth, goalY, goalWidth, goalHeight);

  ctx.beginPath();
  ctx.arc(field.x + boxWidth, centerY, 165, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(field.x + field.width - boxWidth, centerY, 165, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillRect(field.x - 22, centerY - 82, 22, 164);
  ctx.fillRect(field.x + field.width, centerY - 82, 22, 164);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "42px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Jueves FC", centerX, field.y + field.height - 44);

  return field;
}

function lineX(field, teamKey, position) {
  const left = {
    Arquero: field.x + 78,
    Defensa: field.x + 275,
    Medio: field.x + 535,
    Delantero: field.x + 760
  };
  const right = {
    Arquero: field.x + field.width - 78,
    Defensa: field.x + field.width - 275,
    Medio: field.x + field.width - 535,
    Delantero: field.x + field.width - 760
  };

  return teamKey === "A" ? left[position] : right[position];
}

function drawTeamOnExport(ctx, field, team, teamKey) {
  const formation = buildFormation(team, teamKey);
  const color = TEAM_COLORS[teamKey];
  const top = field.y + 145;
  const bottom = field.y + field.height - 145;

  for (const position of POSITIONS) {
    const players = formation.buckets[position];
    const x = lineX(field, teamKey, position);
    const yValues = distributeLineY(
      players.length,
      position === "Arquero" ? field.y + 330 : top,
      position === "Arquero" ? field.y + field.height - 330 : bottom
    );

    players.forEach((player, index) => {
      drawPlayerMarker(ctx, player, jerseyNumber(player, team), x, yValues[index], color, position === "Arquero");
    });
  }

  ctx.save();
  ctx.font = "700 44px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = teamKey === "A" ? "left" : "right";
  ctx.fillText(teamKey === "A" ? "Equipo A" : "Equipo B", teamKey === "A" ? field.x : field.x + field.width, field.y - 28);
  ctx.restore();
}

function downloadFormationImage() {
  const { teamA, teamB } = drawTeams();
  if (!state.draw || !teamA.length || !teamB.length) return false;
  ensureDrawTactics(teamA, teamB);

  const canvas = document.createElement("canvas");
  canvas.width = 2000;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  const field = drawField(ctx, canvas.width, canvas.height);

  drawTeamOnExport(ctx, field, teamA, "A");
  drawTeamOnExport(ctx, field, teamB, "B");

  const link = document.createElement("a");
  const date = state.match.date || new Date().toISOString().slice(0, 10);
  link.download = `jueves-fc-formacion-${date}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function renderDraw() {
  const { teamA, teamB } = drawTeams();
  if (state.draw) ensureDrawTactics(teamA, teamB);
  renderTeam(elements.teamAList, teamA);
  renderTeam(elements.teamBList, teamB);
  const formationA = renderFormation(elements.teamAFormation, teamA, "A");
  const formationB = renderFormation(elements.teamBFormation, teamB, "B");

  if (!state.draw || !formationA || !formationB) {
    elements.finalFormationPanel.hidden = true;
    elements.finalFormationOutput.value = "";
    elements.drawInsight.innerHTML = `<span>Selecciona disponibles y sortea para ver el balance.</span>`;
    return;
  }

  const aCounts = formationA.buckets;
  const bCounts = formationB.buckets;
  elements.drawInsight.innerHTML = `
    <span>Arqueros: <strong>${aCounts.Arquero.length}</strong> vs <strong>${bCounts.Arquero.length}</strong></span>
    <span>Defensa: <strong>${aCounts.Defensa.length}</strong> vs <strong>${bCounts.Defensa.length}</strong></span>
    <span>Medio: <strong>${aCounts.Medio.length}</strong> vs <strong>${bCounts.Medio.length}</strong></span>
    <span>Delantero: <strong>${aCounts.Delantero.length}</strong> vs <strong>${bCounts.Delantero.length}</strong></span>
  `;

  if (!elements.finalFormationPanel.hidden) {
    elements.finalFormationOutput.value = finalFormationText();
  }
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
  renderConstraints();
  renderTeamSwap();
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
    const player = getPlayer(id);
    state.players = state.players.filter((player) => player.id !== id);
    state.constraints = (state.constraints || []).filter(
      (constraint) => constraint.playerA !== id && constraint.playerB !== id
    );
    state.draw = null;
    saveState();
    if (player && elements.availableFeedback) {
      elements.availableFeedback.textContent = `${player.name} eliminado.`;
    }
  }

  if (action === "delete-constraint") {
    state.constraints = (state.constraints || []).filter((constraint) => constraint.id !== event.target.dataset.id);
    state.draw = null;
    saveState();
  }

  if (action === "apply-formation") {
    const teamKey = event.target.dataset.team;
    if (!state.draw || !TEAM_KEYS.includes(teamKey)) return;
    state.draw.formations = state.draw.formations || {};
    state.draw.assignments = state.draw.assignments || {};
    state.draw.formations[teamKey] = event.target.dataset.formation;
    state.draw.assignments[teamKey] = {};
    setKeeperVacant(teamKey, false);
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

  if (action === "update-name") {
    const player = getPlayer(event.target.dataset.id);
    if (!player) return;
    const name = sanitizePlayerName(event.target.value);
    const duplicate = state.players.some(
      (candidate) => candidate.id !== player.id && normalizeToken(candidate.name) === normalizeToken(name)
    );

    if (!name || duplicate) {
      event.target.value = player.name;
      elements.drawInsight.innerHTML = `<span>Usa un nombre valido y que no este repetido.</span>`;
      return;
    }

    player.name = name;
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

  if (action === "update-formation") {
    const teamKey = event.target.dataset.team;
    if (!state.draw || !TEAM_KEYS.includes(teamKey)) return;
    state.draw.formations = state.draw.formations || {};
    state.draw.assignments = state.draw.assignments || {};
    state.draw.formations[teamKey] = event.target.value;
    state.draw.assignments[teamKey] = {};
    setKeeperVacant(teamKey, false);
    saveState();
  }
});

document.addEventListener("dragstart", (event) => {
  const token = event.target.closest('[data-action="move-player"]');
  if (!token || !state.draw) return;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      team: token.dataset.team,
      playerId: token.dataset.playerId,
      position: token.dataset.position
    })
  );
  token.classList.add("is-dragging");
});

document.addEventListener("dragend", () => {
  $$(".is-dragging, .is-over, .is-swap-target").forEach((element) =>
    element.classList.remove("is-dragging", "is-over", "is-swap-target")
  );
});

document.addEventListener("dragover", (event) => {
  const dropZone = event.target.closest("[data-drop-position]");
  const targetToken = event.target.closest('[data-action="move-player"]');
  if (!dropZone && !targetToken) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

document.addEventListener("dragenter", (event) => {
  const dropZone = event.target.closest("[data-drop-position]");
  const targetToken = event.target.closest('[data-action="move-player"]');
  if (dropZone) dropZone.classList.add("is-over");
  if (targetToken) targetToken.classList.add("is-swap-target");
});

document.addEventListener("dragleave", (event) => {
  const dropZone = event.target.closest("[data-drop-position]");
  const targetToken = event.target.closest('[data-action="move-player"]');
  if (dropZone && !dropZone.contains(event.relatedTarget)) dropZone.classList.remove("is-over");
  if (targetToken && !targetToken.contains(event.relatedTarget)) targetToken.classList.remove("is-swap-target");
});

document.addEventListener("drop", (event) => {
  const dropZone = event.target.closest("[data-drop-position]");
  const targetToken = event.target.closest('[data-action="move-player"]');
  if ((!dropZone && !targetToken) || !state.draw) return;
  event.preventDefault();

  let payload;
  try {
    payload = JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return;
  }

  const teamKey = payload.team;
  const playerId = payload.playerId;
  const sourcePosition = payload.position;

  if (!TEAM_KEYS.includes(teamKey) || !POSITIONS.includes(sourcePosition)) return;
  if (!getDrawTeamIds(teamKey).includes(playerId)) return;

  if (targetToken && targetToken.dataset.playerId !== playerId) {
    const targetTeam = targetToken.dataset.team;
    const targetPlayerId = targetToken.dataset.playerId;
    const targetPosition = targetToken.dataset.position;

    if (!TEAM_KEYS.includes(targetTeam) || !POSITIONS.includes(targetPosition)) return;
    if (!getDrawTeamIds(targetTeam).includes(targetPlayerId)) return;

    if (targetTeam !== teamKey) {
      swapPlayersAcrossTeams(playerId, targetPlayerId);
      saveState();
      return;
    }

    removePlayerAssignment(teamKey, playerId);
    removePlayerAssignment(targetTeam, targetPlayerId);
    setPlayerAssignment(teamKey, targetPlayerId, sourcePosition);
    setPlayerAssignment(targetTeam, playerId, targetPosition);
    saveState();
    return;
  }

  const targetPosition = dropZone?.dataset.dropPosition;
  if (!dropZone || dropZone.dataset.team !== teamKey || !POSITIONS.includes(targetPosition)) return;

  if (sourcePosition === "Arquero" && targetPosition !== "Arquero") {
    setKeeperVacant(teamKey, true);
  }
  setPlayerAssignment(teamKey, playerId, targetPosition);
  saveState();
});

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(elements.playerForm);
  const positions = form.getAll("positions");
  const name = sanitizePlayerName(form.get("name"));
  if (!name) return;
  if (state.players.some((player) => normalizeToken(player.name) === normalizeToken(name))) {
    elements.bulkImportFeedback.textContent = "Ese jugador ya existe.";
    return;
  }

  const player = {
    id: uid(),
    name,
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

elements.constraintForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const playerA = elements.constraintPlayerA.value;
  const playerB = elements.constraintPlayerB.value;
  const type = elements.constraintType.value;

  if (!playerA || !playerB || playerA === playerB) {
    elements.drawInsight.innerHTML = `<span>Elige dos jugadores distintos para crear la condicion.</span>`;
    return;
  }

  const samePair = (constraint) =>
    (constraint.playerA === playerA && constraint.playerB === playerB) ||
    (constraint.playerA === playerB && constraint.playerB === playerA);
  const existing = (state.constraints || []).find(samePair);

  if (existing) {
    existing.type = type;
  } else {
    state.constraints = state.constraints || [];
    state.constraints.push({ id: uid(), playerA, playerB, type });
  }

  state.draw = null;
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

elements.dayListForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const { names, duplicateCount } = parseDayList(elements.dayListText.value);

  if (!names.length) {
    elements.dayListFeedback.textContent = "Pega al menos un nombre.";
    return;
  }

  const playersByName = new Map();
  state.players.forEach((player) => {
    const key = normalizeToken(player.name);
    if (!playersByName.has(key)) playersByName.set(key, player);
    player.available = false;
  });

  let createdCount = 0;
  names.forEach((name) => {
    const key = normalizeToken(name);
    let player = playersByName.get(key);

    if (!player) {
      player = {
        id: uid(),
        name,
        rating: 3,
        positions: ["Medio"],
        available: false
      };
      state.players.push(player);
      playersByName.set(key, player);
      createdCount += 1;
    }

    player.available = true;
  });

  state.draw = null;
  saveState();
  elements.dayListFeedback.textContent = `${names.length} disponibles. ${createdCount} nuevos. ${duplicateCount} repetidos ignorados.`;
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

elements.removeDuplicatePlayersBtn.addEventListener("click", () => {
  const duplicateCount = duplicatePlayerCountByName(state.players);
  normalizeRosterState(state);
  if (duplicateCount) state.draw = null;
  saveState();
  elements.availableFeedback.textContent = duplicateCount
    ? `${duplicateCount} duplicados eliminados por nombre.`
    : "No habia duplicados por nombre.";
});

elements.swapTeamsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.draw) {
    elements.drawInsight.innerHTML = `<span>Primero debes sortear equipos.</span>`;
    return;
  }

  const playerAId = elements.swapPlayerA.value;
  const playerBId = elements.swapPlayerB.value;

  if (!playerAId || !playerBId || !swapPlayersAcrossTeams(playerAId, playerBId)) {
    elements.drawInsight.innerHTML = `<span>Elige un jugador de cada equipo para intercambiar.</span>`;
    return;
  }

  saveState();
});

elements.finalFormationBtn.addEventListener("click", () => {
  const output = finalFormationText();
  if (!output) {
    elements.drawInsight.innerHTML = `<span>Primero debes sortear equipos.</span>`;
    return;
  }

  elements.finalFormationPanel.hidden = false;
  elements.finalFormationOutput.value = output;

  if (downloadFormationImage()) {
    elements.drawInsight.innerHTML = `<span>Imagen de formacion descargada.</span>`;
    return;
  }

  elements.drawInsight.innerHTML = `<span>No se pudo generar la imagen de formacion.</span>`;
});

elements.drawBtn.addEventListener("click", () => {
  try {
    state.draw = makeDraw();
    elements.finalFormationPanel.hidden = true;
    elements.finalFormationOutput.value = "";
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
