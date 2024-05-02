import constants from './constants';

export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export const filterAndAdjustScores = (data, timeSpentDrawing) => {
  if (!data || data.length === 0) {
    return [];
  }

  const filteredResult = data.filter(
    (x) => !constants.BANNED_LABELS.includes(x.label)
  );

  const applyEasyMode = timeSpentDrawing - constants.REJECT_TIME_DELAY;

  if (applyEasyMode > 0 && filteredResult.length > 0 && filteredResult[0].score > constants.START_REJECT_THRESHOLD) {
    let amount = applyEasyMode / constants.REJECT_TIME_PER_LABEL;
    for (let i = 0; i < filteredResult.length && i < amount + 1; ++i) {
      if (amount > i) {
        filteredResult[i].score = 0;
      } else {
        filteredResult[i].score *= i - amount;
      }
    }
    filteredResult.sort((a, b) => b.score - a.score);
  }

  const sum = filteredResult.reduce((acc, x) => acc + x.score, 0);
  filteredResult.forEach((x) => (x.score /= sum));

  return filteredResult;
};

export const createWorkers = () => {
  const worker1 = new Worker(new URL('./worker1.js', import.meta.url), {
    type: 'module',
  });

  const worker2 = new Worker(new URL('./worker2.js', import.meta.url), {
    type: 'module',
  });

  return { worker1, worker2 };
};

export const startCountdown = (setCountdown, setGameState) => {
  setGameState('countdown');
  const countdownTimer = setInterval(() => {
    setCountdown((prevCount) => prevCount - 1);
  }, 1000);

  return () => {
    clearInterval(countdownTimer);
  };
};

export const startGame = (setGameStartTime, setPredictions, setGameState) => {
  setGameStartTime(performance.now());
  setPredictions([]);
  setGameState('playing');
};

export const endGame = (setGameState, addPrediction, handleClearCanvas, cancelled) => {
  if (!cancelled) {
    addPrediction(false);
  }
  handleClearCanvas(true);
  setGameState(cancelled ? 'menu' : 'end');
};

export const goToNextWord = (addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, isCorrect, setGameStartTime) => {
  if (!isCorrect) {
    setGameStartTime((prev) => prev - constants.SKIP_PENALTY);
  }
  addPrediction(isCorrect);
  setTargetIndex((prev) => prev + 1);
  setOutput1(null);
  setOutput2(null);
  setSketchHasChanged(false);
  handleClearCanvas(true);
};

export const checkGameOver = (gameState, gameCurrentTime, gameStartTime, endGame) => {
  if (
    gameState === 'playing' &&
    gameCurrentTime !== null &&
    gameStartTime !== null &&
    (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION
  ) {
    endGame();
  }
};

export const checkWordGuessed = (gameState, output1, output2, targets, targetIndex, goToNextWord) => {
  if (gameState === 'playing' && output1 !== null && output2 !== null && targets !== null) {
    if (targets[targetIndex] === output1[0].label || targets[targetIndex] === output2[0].label) {
      goToNextWord(true);
    }
  }
};

export const gameLoop = (gameState, isPredicting1, isPredicting2, sketchHasChanged, classify, setSketchHasChanged, setGameCurrentTime) => {
  if (gameState === 'playing') {
    const intervalId = setInterval(() => {
      if (sketchHasChanged && !isPredicting1 && !isPredicting2) {
        classify();
      }
      setSketchHasChanged(false);
      setGameCurrentTime(performance.now());
    }, constants.PREDICTION_REFRESH_TIME);

    return () => {
      clearInterval(intervalId);
    };
  }
};