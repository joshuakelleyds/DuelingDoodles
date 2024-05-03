import constants from './constants';

// Function to format time as "minutes:seconds"
export const formatTime = (seconds) => {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const shuffleArray = (array) => {
  // shuffles the elements of an array in place
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export const filterAndAdjustScores = (data, timeSpentDrawing) => {
  // filters out banned labels and adjusts scores based on time spent drawing
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
  // creates two web workers for parallel processing
  const worker1 = new Worker(new URL('./worker1.js', import.meta.url), {
    type: 'module',
  });

  const worker2 = new Worker(new URL('./worker2.js', import.meta.url), {
    type: 'module',
  });

  return { worker1, worker2 };
};

export const startCountdown = (setCountdown, setGameState) => {
  // starts the countdown timer and sets the game state to 'countdown'
  setGameState('countdown');
  const countdownTimer = setInterval(() => {
    setCountdown((prevCount) => {
      const newCount = prevCount - 1;
      return newCount;
    });
  }, 1000);

  return () => {
    clearInterval(countdownTimer);
  };
};

export const startGame = (setGameStartTime, setPredictions, setGameState) => {
  // starts the game by setting the start time, resetting predictions, and setting the game state to 'playing'
  setGameStartTime(performance.now());
  setPredictions([]);
  setGameState('playing');
};

export const endGame = (setGameState, addPrediction, handleClearCanvas, cancelled) => {
  // ends the game by adding a final prediction (if not cancelled), clearing the canvas, and setting the game state to 'menu' or 'end'
  if (!cancelled) {
    addPrediction(false);
  }
  handleClearCanvas(true);
  setGameState(cancelled ? 'menu' : 'end');
};

export const goToNextWord = (addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, isCorrect, setGameStartTime) => {
  // moves to the next word by adding a prediction, updating the target index, resetting outputs and sketch change, clearing the canvas, and applying a penalty if incorrect
  if (!isCorrect) {
    setGameStartTime((prev) => {
      const newStartTime = prev - constants.SKIP_PENALTY;
      return newStartTime;
    });
  }
  addPrediction(isCorrect);
  setTargetIndex((prev) => {
    const newIndex = prev + 1;
    return newIndex;
  });
  setOutput1(null);
  setOutput2(null);
  setSketchHasChanged(false);
  handleClearCanvas(true);
};

export const checkGameOver = (gameState, gameCurrentTime, gameStartTime, endGame) => {
  // checks if the game is over based on the elapsed time and ends the game if necessary
  if (
    gameState === 'playing' &&
    gameCurrentTime !== null &&
    gameStartTime !== null &&
    (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION
  ) {
    endGame();
  }
};

export const checkWordGuessed = (gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime) => {
  // checks if the current word has been guessed correctly based on the outputs and moves to the next word if correct
  if (gameState === 'playing' && output1 !== null && output2 !== null && targets !== null) {
    if (targets[targetIndex] === output1[0].label || targets[targetIndex] === output2[0].label) {
      goToNextWord(addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, true, setGameStartTime);
    }
  }
};

export const gameLoop = (gameState, isPredicting1, isPredicting2, sketchHasChanged, classify, setSketchHasChanged, setGameCurrentTime) => {
  // runs the game loop, triggering classification if the sketch has changed and updating the current time
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