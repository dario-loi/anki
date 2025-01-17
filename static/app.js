// Configure marked.js
marked.setOptions({
    breaks: true,
    gfm: true
});

// Global state
let currentCard = null;
let isFlipped = false;
let timerState = {
    timeLeft: 25 * 60,
    isPomodoro: true,
    pomodoroCount: 0,
    isRunning: false,
    startTime: null,
    timerInterval: null,
    initialTime: 25 * 60
};
// Add to global state
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// DOM elements
const cardElement = document.querySelector('.card');
const frontContent = document.getElementById('front-content');
const backContent = document.getElementById('back-content');
const timerElement = document.getElementById('timer');
const counterElement = document.getElementById('counter');
const prevButton = document.getElementById('prev-btn');
const nextButton = document.getElementById('next-btn');
const flipButton = document.getElementById('flip-btn');
const timerToggleButton = document.getElementById('timer-toggle');
const timerResetButton = document.getElementById('timer-reset');
const skipBreakButton = document.getElementById('skip-break');




async function playSound(freq, duration, type = 'sine') {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = type;
  oscillator.frequency.value = freq;
  
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playBreakStartSound() {
  setTimeout(() => playSound(261.63, 1.4, 'sine'), 0);    // C4
  setTimeout(() => playSound(523.25, 0.8, 'sine'), 50);   // C5
  setTimeout(() => playSound(659.25, 0.9, 'sine'), 250);  // E5
  setTimeout(() => playSound(783.99, 0.8, 'sine'), 450);  // G5
  setTimeout(() => playSound(987.77, 0.9, 'sine'), 650);  // B5
}

function playBreakEndSound() {
  setTimeout(() => playSound(261.63, 1.4, 'sine'), 0);    // C4
  setTimeout(() => playSound(523.25, 0.8, 'sine'), 50);   // C5
  setTimeout(() => playSound(987.77, 0.9, 'sine'), 250);  // B5
  setTimeout(() => playSound(783.99, 0.8, 'sine'), 450);  // G5
  setTimeout(() => playSound(659.25, 0.9, 'sine'), 650);  // E5
}

function playStartSound() {
  setTimeout(() => playSound(523.25, 1.4, 'sine'), 0);   // C5
  setTimeout(() => playSound(783.99, 0.7, 'sine'), 50);  // G5
}

function playPauseSound() {
  setTimeout(() => playSound(523.25, 1.4, 'sine'), 0);   // C5
  setTimeout(() => playSound(392.00, 0.7, 'sine'), 50);  // G4
}

// Render content with Markdown and MathJax
function renderContent(content, element) {
    // Process markdown first
    const htmlContent = marked.parse(content);
    element.innerHTML = htmlContent;

    // Then process MathJax
    MathJax.typesetPromise([element]).catch((err) => console.error('MathJax error:', err));
}


// Card operations
async function fetchCurrentCard() {
    try {
        const [cardResponse, stateResponse] = await Promise.all([
            fetch('/api/card/current'),
            fetch('/api/state')
        ]);

        const [cardData, stateData] = await Promise.all([
            cardResponse.json(),
            stateResponse.json()
        ]);

        currentCard = cardData;
        updateCardDisplay();
        updateCounter(stateData.cards_remaining);
    } catch (error) {
        console.error('Error fetching card:', error);
    }
}

async function nextCard() {
    try {
        const [cardResponse, stateResponse] = await Promise.all([
            fetch('/api/card/next'),
            fetch('/api/state')
        ]);

        const [cardData, stateData] = await Promise.all([
            cardResponse.json(),
            stateResponse.json()
        ]);

        currentCard = cardData;
        isFlipped = false;
        cardElement.classList.remove('flipped');
        updateCardDisplay();
        updateCounter(stateData.cards_remaining);
    } catch (error) {
        console.error('Error fetching next card:', error);
    }
}

async function previousCard() {
    try {
        const [cardResponse, stateResponse] = await Promise.all([
            fetch('/api/card/previous'),
            fetch('/api/state')
        ]);

        const [cardData, stateData] = await Promise.all([
            cardResponse.json(),
            stateResponse.json()
        ]);

        currentCard = cardData;
        isFlipped = false;
        cardElement.classList.remove('flipped');
        updateCardDisplay();
        updateCounter(stateData.cards_remaining);
    } catch (error) {
        console.error('Error fetching previous card:', error);
    }
}


async function flipCard() {
    await fetch('/api/card/flip');
    isFlipped = !isFlipped;
    cardElement.classList.toggle('flipped');
}

// Display updates
function updateCardDisplay() {
    if (currentCard) {
        // Get the maximum height between front and back content
        renderContent(currentCard.front, frontContent);
        renderContent(currentCard.back, backContent);

        // Wait for MathJax to finish rendering before adjusting height
        MathJax.typesetPromise().then(() => {
            const frontHeight = frontContent.scrollHeight;
            const backHeight = backContent.scrollHeight;
            const maxHeight = Math.max(frontHeight, backHeight);

            // Add some padding to the height
            const containerHeight = maxHeight + 64; // 32px padding top and bottom
            document.querySelector('.card-container').style.height = `${containerHeight}px`;
        });
    }
}

function updateCounter(remaining) {
    counterElement.textContent = `Cards Remaining: ${remaining}`;
}

// Precise timer implementation
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const label = timerState.isPomodoro ? 'Focus' : 'Break';
    timerElement.textContent = `${label}: ${formatTime(timerState.timeLeft)}`;
    timerElement.className = `pomodoro-timer text-2xl font-bold ${timerState.isPomodoro ? 'focus' : 'break'}`;
}

function startTimer() {
    if (!timerState.isRunning) {
        playStartSound();
        timerState.isRunning = true;
        timerState.initialTime = timerState.timeLeft;
        timerState.startTime = Date.now();
        timerState.timerInterval = setInterval(updateTimer, 100);
        timerToggleButton.textContent = 'Pause';
    }
}

function pauseTimer() {
    if (timerState.isRunning) {
        playPauseSound();
        timerState.isRunning = false;
        clearInterval(timerState.timerInterval);
        timerToggleButton.textContent = 'Start';
    }
}

function resetTimer() {
    pauseTimer();
    timerState.timeLeft = timerState.isPomodoro ? 25 * 60 : (timerState.pomodoroCount % 4 === 0 ? 15 * 60 : 5 * 60);
    updateTimerDisplay();
}

function skipBreak() {
    if (!timerState.isPomodoro) {
        timerState.isPomodoro = true;
        timerState.timeLeft = 25 * 60;
        resetTimer();
        startTimer();
    }
}

function updateTimer() {
    if (!timerState.isRunning) return;

    const currentTime = Date.now();
    const elapsed = (currentTime - timerState.startTime) / 1000;
    timerState.timeLeft = Math.max(0, timerState.initialTime - elapsed);

    if (timerState.timeLeft <= 0) {
        handleTimerComplete();
    }

    if (timerState.timeLeft <= 5) {
        playSound(440, 0.1, 'sine');
    }

    updateTimerDisplay();
}

function handleTimerComplete() {
    pauseTimer();

    if (timerState.isPomodoro) {
        timerState.pomodoroCount++;
        timerState.isPomodoro = false;
        timerState.timeLeft = timerState.pomodoroCount % 4 === 0 ? 15 * 60 : 5 * 60;
        playBreakStartSound();
        notifyUser('Time for a break!', `Take a ${timerState.pomodoroCount % 4 === 0 ? '15' : '5'} minute break.`);
    } else {
        timerState.isPomodoro = true;
        timerState.timeLeft = 25 * 60;
        playBreakEndSound();
        notifyUser('Break is over!', 'Time to focus again.');
    }

    timerState.initialTime = timerState.timeLeft;
    startTimer();
}
function notifyUser(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

async function loadDecks() {
    const response = await fetch('/api/decks');
    const decks = await response.json();
    const select = document.getElementById('deck-select');

    decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck.name;
        option.textContent = deck.name;
        select.appendChild(option);
    });
}

async function selectDeck(deckName) {
    await fetch(`/api/deck/select/${deckName}`, { method: 'POST' });
    await fetchCurrentCard();
}


// Event listeners
flipButton.addEventListener('click', flipCard);
nextButton.addEventListener('click', nextCard);
prevButton.addEventListener('click', previousCard);
timerToggleButton.addEventListener('click', () => {
    timerState.isRunning ? pauseTimer() : startTimer();
});
timerResetButton.addEventListener('click', resetTimer);
skipBreakButton.addEventListener('click', skipBreak);


// Add to initialize()
document.addEventListener('click', initAudio, { once: true });

// Add to global state
let clickTimer = null;
let clickStartTime = null;

// Replace card container click listener with these handlers
document.querySelector('.card-container').addEventListener('mousedown', (e) => {
    clickStartTime = Date.now();
});

document.querySelector('.card-container').addEventListener('mouseup', (e) => {
    const clickDuration = Date.now() - clickStartTime;
    const hasSelection = window.getSelection().toString().length > 0;

    if (clickDuration < 200 && !hasSelection) {
        flipCard();
    }
});



document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case ' ':
        case 'Enter':
            flipCard();
            break;
        case 'ArrowRight':
            nextCard();
            break;
        case 'ArrowLeft':
            previousCard();
            break;
    }
});


async function initialize() {
    timerState.initialTime = timerState.timeLeft;
    await fetchCurrentCard();
    updateTimerDisplay();

    // Add click handler for notification permission
    document.addEventListener('click', async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }, { once: true });


    await loadDecks();
    document.getElementById('deck-select').addEventListener('change', (e) => {
        selectDeck(e.target.value);
    });

}

initialize();
