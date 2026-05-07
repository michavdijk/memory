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
const moveCountLabel = document.getElementById("moveCount");
const timerLabel = document.getElementById("timer");
const messageLabel = document.getElementById("message");
const newGameButton = document.getElementById("newGameButton");

let deck = [];
let firstCard = null;
let secondCard = null;
let canFlip = true;
let moves = 0;
let matchedPairs = 0;
let timerId = null;
let secondsElapsed = 0;

function initializeGame() {
  registerServiceWorker();
  newGameButton.addEventListener("click", startNewGame);
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
  moves = 0;
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
    button.addEventListener("click", handleCardClick);
    gameBoard.appendChild(button);
  });
}

function handleCardClick(event) {
  if (!canFlip) {
    return;
  }

  const cardElement = event.currentTarget;
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
  moves += 1;
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
  firstCard.classList.add("disabled");
  secondCard.classList.add("disabled");
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
  setMessage(`Klaar! ${moves} zetten, ${formatTime(secondsElapsed)}.`);
  canFlip = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateStatusLabels() {
  moveCountLabel.textContent = moves.toString();
  timerLabel.textContent = formatTime(secondsElapsed);
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
