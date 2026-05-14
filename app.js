const cardArt = [
  {
    type: 0,
    alt: "Mario",
    image: "images/mario.png"
  },
  {
    type: 1,
    alt: "Luigi",
    image: "images/luigi.png"
  },
  {
    type: 2,
    alt: "Peach",
    image: "images/peach.png"
  },
  {
    type: 3,
    alt: "Yoshi",
    image: "images/yoshi.png"
  },
  {
    type: 4,
    alt: "Boo",
    image: "images/boo.png"
  },
  {
    type: 5,
    alt: "Goomba",
    image: "images/goomba.png"
  },
  {
    type: 6,
    alt: "Green Mushroom",
    image: "images/green_mushroom.png"
  },
  {
    type: 7,
    alt: "Red Mushroom",
    image: "images/red_mushroom.png"
  }
];
const gameBoard = document.getElementById("gameBoard");
const attemptCountLabel = document.getElementById("attemptCount");
const timerLabel = document.getElementById("timer");
const messageLabel = document.getElementById("message");
const newGameButton = document.getElementById("newGameButton");
const bestTimeLabel = document.getElementById("bestTime");
const bestAttemptsLabel = document.getElementById("bestAttempts");

const HIGHSCORES_STORAGE_KEY = "retroMemoryHighscores";
const FORGIVING_TAP_MARGIN = 18;
const POINTER_CLICK_SUPPRESSION_MS = 450;

let deck = [];
let firstCard = null;
let secondCard = null;
let canFlip = true;
let attempts = 0;
let matchedPairs = 0;
let timerId = null;
let secondsElapsed = 0;
let lastTouchEndTime = 0;
let lastPointerActivationTime = 0;
let highscores = {
  bestTime: null,
  bestAttempts: null
};

function preventGestureZoom(event) {
  event.preventDefault();
}

function preventMultiTouch(event) {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}

function preventDoubleTapZoom(event) {
  const now = performance.now();
  const interactive = event.target.closest("button, .card, .action-button, a, input, textarea, select");
  if (now - lastTouchEndTime < 300 && !interactive) {
    event.preventDefault();
  }
  lastTouchEndTime = now;
}

function setupMobileGestureBlockers() {
  document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
  document.addEventListener("touchmove", preventMultiTouch, { passive: false });
  document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
}

function initializeGame() {
  registerServiceWorker();
  setupMobileGestureBlockers();
  highscores = loadHighscores();
  updateHighscoreLabels();
  newGameButton.addEventListener("click", startNewGame);
  gameBoard.addEventListener("pointerdown", handleBoardPointerDown);
  gameBoard.addEventListener("click", handleBoardClick);
  startNewGame();
}

function startNewGame() {
  resetGameState();
  buildDeck();
  renderBoard();
  updateStatusLabels();
  setMessage("Tik een kaart en zoek een match.");
  startTimer();
}

function resetGameState() {
  deck = [];
  firstCard = null;
  secondCard = null;
  canFlip = true;
  attempts = 0;
  matchedPairs = 0;
  secondsElapsed = 0;
  if (timerId) {
    clearInterval(timerId);
  }
}

function buildDeck() {
  const cardTemplates = [...cardArt, ...cardArt];
  const shuffledCards = shuffleArray(cardTemplates);
  deck = shuffledCards.map((card, index) => ({
    id: index,
    type: card.type,
    image: card.image,
    alt: card.alt,
    matched: false,
  }));
}

function renderBoard() {
  gameBoard.innerHTML = "";
  deck.forEach((card) => {
    const button = document.createElement("button");
    button.className = "card";
    button.type = "button";
    button.dataset.id = card.id;
    button.setAttribute("aria-label", "Kaart omdraaien");
    button.innerHTML = `
      <span class="card-face card-back"></span>
      <span class="card-face card-front"><img class="card-image" src="${card.image}" alt="${card.alt}" /></span>
    `;
    gameBoard.appendChild(button);
  });
}

function handleBoardPointerDown(event) {
  if (!event.isPrimary || event.button > 0) {
    return;
  }

  const cardElement = getCardFromInputEvent(event);

  if (!cardElement) {
    return;
  }

  event.preventDefault();
  lastPointerActivationTime = performance.now();
  handleCardSelection(cardElement);
}

function handleBoardClick(event) {
  if (performance.now() - lastPointerActivationTime < POINTER_CLICK_SUPPRESSION_MS) {
    event.preventDefault();
    return;
  }

  const cardElement = getCardFromInputEvent(event);

  if (cardElement) {
    handleCardSelection(cardElement);
  }
}

function getCardFromInputEvent(event) {
  return getDirectCard(event.target) || getNearestCard(event.clientX, event.clientY);
}

function getDirectCard(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const cardElement = target.closest(".card");
  return cardElement && gameBoard.contains(cardElement) ? cardElement : null;
}

function getNearestCard(clientX, clientY) {
  let nearestCard = null;
  let nearestDistance = Infinity;

  gameBoard.querySelectorAll(".card").forEach((cardElement) => {
    if (cardElement.classList.contains("matched") || cardElement === firstCard) {
      return;
    }

    const rect = cardElement.getBoundingClientRect();
    const horizontalDistance = Math.max(rect.left - clientX, 0, clientX - rect.right);
    const verticalDistance = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
    const distance = Math.hypot(horizontalDistance, verticalDistance);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCard = cardElement;
    }
  });

  return nearestDistance <= FORGIVING_TAP_MARGIN ? nearestCard : null;
}

function handleCardSelection(cardElement) {
  if (!canFlip) {
    return;
  }

  const cardId = Number(cardElement.dataset.id);
  const cardData = deck[cardId];

  if (cardData.matched || cardElement === firstCard) {
    return;
  }

  flipCard(cardElement);
  playFlipSound();

  if (!firstCard) {
    firstCard = cardElement;
    return;
  }

  secondCard = cardElement;
  attempts += 1;
  updateStatusLabels();

  const firstType = deck[Number(firstCard.dataset.id)].type;
  const secondType = deck[Number(secondCard.dataset.id)].type;

  if (firstType === secondType) {
    markMatch();
  } else {
    markMismatch();
  }
}

function flipCard(cardElement) {
  cardElement.classList.add("flipped");
}

function unflipCard(cardElement) {
  cardElement.classList.remove("flipped");
}

function markMatch() {
  deck[Number(firstCard.dataset.id)].matched = true;
  deck[Number(secondCard.dataset.id)].matched = true;
  firstCard.classList.add("disabled", "matched");
  secondCard.classList.add("disabled", "matched");
  matchedPairs += 1;
  playMatchSound();
  vibrate([20, 20, 20]);
  setMessage("Match! Ga door.");
  firstCard = null;
  secondCard = null;

  if (matchedPairs === cardArt.length) {
    endGame();
  }
}

function markMismatch() {
  canFlip = false;
  playErrorSound();
  vibrate(100);
  setMessage("Geen match. Probeer het opnieuw.");
  setTimeout(() => {
    unflipCard(firstCard);
    unflipCard(secondCard);
    firstCard = null;
    secondCard = null;
    canFlip = true;
    setMessage("Tik een kaart en zoek een match.");
  }, 900);
}

function endGame() {
  playWinSound();
  vibrate([40, 20, 40]);
  updateHighscores(secondsElapsed, attempts);
  setMessage(`Klaar! ${attempts} pogingen, ${formatTime(secondsElapsed)}.`);
  canFlip = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateStatusLabels() {
  attemptCountLabel.textContent = attempts.toString();
  timerLabel.textContent = formatTime(secondsElapsed);
}

function loadHighscores() {
  try {
    const savedHighscores = window.localStorage.getItem(HIGHSCORES_STORAGE_KEY);
    if (!savedHighscores) {
      return createEmptyHighscores();
    }

    const parsedHighscores = JSON.parse(savedHighscores);
    return {
      bestTime: normalizeHighscoreValue(parsedHighscores.bestTime),
      bestAttempts: normalizeHighscoreValue(parsedHighscores.bestAttempts)
    };
  } catch (error) {
    console.warn("Highscores konden niet worden geladen:", error);
    return { ...highscores };
  }
}

function saveHighscores() {
  try {
    window.localStorage.setItem(HIGHSCORES_STORAGE_KEY, JSON.stringify(highscores));
  } catch (error) {
    console.warn("Highscores konden niet worden opgeslagen:", error);
  }
}

function updateHighscores(finalTime, finalAttempts) {
  const hasFasterTime = highscores.bestTime === null || finalTime < highscores.bestTime;
  const hasFewerAttempts = highscores.bestAttempts === null || finalAttempts < highscores.bestAttempts;

  if (!hasFasterTime && !hasFewerAttempts) {
    return;
  }

  if (hasFasterTime) {
    highscores.bestTime = finalTime;
  }

  if (hasFewerAttempts) {
    highscores.bestAttempts = finalAttempts;
  }

  saveHighscores();
  updateHighscoreLabels();
}

function createEmptyHighscores() {
  return {
    bestTime: null,
    bestAttempts: null
  };
}

function normalizeHighscoreValue(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function updateHighscoreLabels() {
  bestTimeLabel.textContent = highscores.bestTime === null ? "--:--" : formatTime(highscores.bestTime);
  bestAttemptsLabel.textContent = highscores.bestAttempts === null ? "--" : highscores.bestAttempts.toString();
}

function setMessage(text) {
  messageLabel.textContent = text;
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    secondsElapsed += 1;
    updateStatusLabels();
  }, 1000);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createAudioContext() {
  if (typeof AudioContext !== "undefined") {
    return new AudioContext();
  }
  if (typeof window.webkitAudioContext !== "undefined") {
    return new window.webkitAudioContext();
  }
  return null;
}

function playTone(frequency, duration, type = "square", volume = 0.12) {
  const audioContext = createAudioContext();
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function playFlipSound() {
  playTone(420, 80, "square", 0.08);
}

function playMatchSound() {
  playTone(560, 120, "triangle", 0.14);
  setTimeout(() => playTone(720, 80, "triangle", 0.12), 120);
}

function playErrorSound() {
  playTone(180, 140, "sawtooth", 0.16);
}

function playWinSound() {
  playTone(520, 100, "triangle", 0.14);
  setTimeout(() => playTone(660, 90, "triangle", 0.14), 120);
  setTimeout(() => playTone(820, 70, "triangle", 0.14), 240);
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js")
        .then((registration) => {
          console.log("Service Worker geregistreerd:", registration.scope);
        })
        .catch((error) => {
          console.warn("Service Worker registratie mislukt:", error);
        });
    });
  }
}

initializeGame();
