/***********************
 * STATIC DATA PATHS
 ***********************/
const PLAYERS_URL = "./data/players.json?v=1";
const ASSIGNMENTS_URL = "./data/assignments.json?v=1";
const TIMEOUT_SEC = 10;

/***********************
 * STATE
 ***********************/
let players = [];          // [{id, display}, ...]
let assignments = {};      // { "Lucas": { target, mission }, ... }
let countdownTimer = null;

/***********************
 * DOM HELPERS
 ***********************/
const $ = (id) => document.getElementById(id);

function showAlert(msg) {
  const el = $("globalAlert");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearAlert() {
  const el = $("globalAlert");
  el.textContent = "";
  el.classList.add("hidden");
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/***********************
 * NAV
 ***********************/
function showHome() {
  stopCountdown();
  clearAlert();
  $("viewHome").classList.remove("hidden");
  $("viewMission").classList.add("hidden");
  $("inputName").value = "";
  $("autocompleteList").classList.add("hidden");
}

function showMission(playerName, missionText, targetText) {
  clearAlert();

  $("whoami").textContent = `Agent : ${playerName}`;
  $("missionText").textContent = missionText || "—";
  $("targetText").textContent = targetText || "—";

  $("viewHome").classList.add("hidden");
  $("viewMission").classList.remove("hidden");

  startCountdown(TIMEOUT_SEC);
}

/***********************
 * COUNTDOWN (MISSION ONLY)
 ***********************/
function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(seconds) {
  stopCountdown();
  let remaining = seconds;
  $("countdown").textContent = remaining;

  countdownTimer = setInterval(() => {
    remaining--;
    $("countdown").textContent = Math.max(0, remaining);
    if (remaining <= 0) showHome();
  }, 1000);
}

/***********************
 * LOAD STATIC FILES
 ***********************/
async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function initData() {
  players = await loadJson(PLAYERS_URL);
  assignments = await loadJson(ASSIGNMENTS_URL);
}

/***********************
 * AUTOCOMPLETE (iOS SAFE)
 ***********************/
function setupAutocomplete() {
  const input = $("inputName");
  const list = $("autocompleteList");

  input.addEventListener("input", () => {
    const value = normalize(input.value);
    list.innerHTML = "";

    if (!value) {
      list.classList.add("hidden");
      return;
    }

    const matches = players.filter(p =>
      normalize(p.display || p.id).includes(value)
    );

    if (!matches.length) {
      list.classList.add("hidden");
      return;
    }

    matches.forEach(p => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = p.display || p.id;
      div.onclick = () => {
        input.value = p.display || p.id;
        list.classList.add("hidden");
      };
      list.appendChild(div);
    });

    list.classList.remove("hidden");
  });
}

/***********************
 * RESOLVE PLAYER
 ***********************/
function resolvePlayer(inputText) {
  const n = normalize(inputText);
  if (!n) return null;

  const matches = players.filter(
    p => normalize(p.display || p.id) === n
  );

  return matches.length === 1 ? matches[0] : null;
}

function findAssignmentForPlayer(playerName) {
  if (assignments[playerName]) return assignments[playerName];

  const n = normalize(playerName);
  return Object.entries(assignments).find(
    ([k]) => normalize(k) === n
  )?.[1] || null;
}

/***********************
 * EVENTS
 ***********************/
function wireEvents() {
  $("formLogin").addEventListener("submit", (e) => {
    e.preventDefault();

    const player = resolvePlayer($("inputName").value);
    if (!player) {
      showAlert("Merci de choisir un prénom valide dans la liste.");
      return;
    }

    const name = player.id || player.display;
    const mission = findAssignmentForPlayer(name);

    if (!mission) {
      showAlert("Mission introuvable pour ce prénom.");
      return;
    }

    showMission(name, mission.mission, mission.target);
  });

  $("btnHomeMission").addEventListener("click", showHome);
}

/***********************
 * INIT
 ***********************/
(async function init() {
  try {
    wireEvents();
    showHome();
    await initData();
    setupAutocomplete();
  } catch (err) {
    console.error(err);
    showAlert("Erreur de chargement des fichiers data.");
  }
})();
