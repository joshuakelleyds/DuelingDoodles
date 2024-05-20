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

export const createWorkers = (modelName1, modelName2) => {
  try {
    // creates two web workers for parallel processing
    const worker1 = new Worker(new URL('./worker1.js', import.meta.url), {
      type: 'module',
    });

    const worker2 = new Worker(new URL('./worker2.js', import.meta.url), {
      type: 'module',
    });

    // send the model name to the workers
    worker1.postMessage({ action: 'setModel', modelName: modelName1 });
    worker2.postMessage({ action: 'setModel', modelName: modelName2 });

    return { worker1, worker2 };
  } catch (error) {
    console.error('Error creating workers:', error);
    return null;
  }
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

export const endGame = (setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, selectedModels) => {
  // ends the game by adding a final prediction (if not cancelled), clearing the canvas, and setting the game state to 'menu' or 'end'
  if (!cancelled) {
    addPrediction(false);
  }
  handleClearCanvas(true);
  setGameState(cancelled ? 'menu' : 'end');
  
  // Make sure modelStats is defined and has the correct structure
  if (modelStats && modelStats.correctGuessesModel1 !== undefined && modelStats.correctGuessesModel2 !== undefined) {
    // Calculate and update leaderboard data
    const leaderboardData = updateTableData(modelStats, selectedModels);
    setLeaderboardData(leaderboardData);
  } else {
    console.error('modelStats is undefined or has an incorrect structure');
  }
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

export const checkGameOver = (setGameState, gameState, gameCurrentTime, gameStartTime, endGame, setLeaderboardData, modelStats, setModelStats, addPrediction, handleClearCanvas, cancelled, selectedModels) => {
  // checks if the game is over based on the elapsed time and ends the game if necessary
  if (
    gameState === 'playing' &&
    gameCurrentTime !== null &&
    gameStartTime !== null &&
    (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION
  ) {
    endGame(setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, selectedModels);
  }
};

export const checkWordGuessed = (gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime, modelStats, setModelStats) => {
  // checks if the current word has been guessed correctly based on the outputs and moves to the next word if correct
  if (gameState === 'playing' && output1 !== null && output2 !== null && targets !== null) {
    const target = targets[targetIndex]; // get the current target word
    const predictedByModel1 = target === output1[0].label; // check if model 1 predicted correctly
    const predictedByModel2 = target === output2[0].label; // check if model 2 predicted correctly

    if (predictedByModel1 || predictedByModel2) { // if either model predicted correctly
      // Update model stats
      setModelStats((prevStats) => ({
        ...prevStats,
        correctGuessesModel1: predictedByModel1 ? prevStats.correctGuessesModel1 + 1 : prevStats.correctGuessesModel1,
        correctGuessesModel2: predictedByModel2 ? prevStats.correctGuessesModel2 + 1 : prevStats.correctGuessesModel2,
        lastPredictionTimeModel1: predictedByModel1 ? new Date() : prevStats.lastPredictionTimeModel1,
        lastPredictionTimeModel2: predictedByModel2 ? new Date() : prevStats.lastPredictionTimeModel2,
      }));

      // proceed to the next word
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

export const updateTableData = (modelStats, selectedModels) => {
  const modelStatsMap = {}; // Map to store model stats

  const model1 = selectedModels[0];
  const model2 = selectedModels[1];

  // Calculate ELO ratings based on correct guesses
  const calculateElo = (correctGuesses) => {
    // ELO calculation logic, adjust as necessary
    const K = 32; // K-factor
    const initialElo = 1000; // Initial ELO rating

    const elo = initialElo + K * correctGuesses;
    return elo;
  };

  // Populate model stats map
  modelStatsMap[model1] = {
    correctGuesses: modelStats.correctGuessesModel1,
    lastPredictionTime: modelStats.lastPredictionTimeModel1,
    elo: calculateElo(modelStats.correctGuessesModel1)
  };
  modelStatsMap[model2] = {
    correctGuesses: modelStats.correctGuessesModel2,
    lastPredictionTime: modelStats.lastPredictionTimeModel2,
    elo: calculateElo(modelStats.correctGuessesModel2)
  };

  // Calculate average time between predictions
  const calculateAvgTime = (lastPredictionTime, correctGuesses) => {
    const totalTime = lastPredictionTime ? (Date.now() - new Date(lastPredictionTime)) / 1000 : 0;
    return (totalTime / correctGuesses).toFixed(2);
  };

  // Sort models by correct guesses
  const sortedModels = Object.entries(modelStatsMap).sort((a, b) => b[1].correctGuesses - a[1].correctGuesses);

  // Map sorted models to table data
  return sortedModels.map(([model, stats], index) => {
    const modelName = constants.MODELNAMEMAP[model];
    const params = constants.MODELPARAMS[model];
    return [
      index + 1, // Rank
      modelName, // Model
      stats.elo, // ELO
      calculateAvgTime(stats.lastPredictionTime, stats.correctGuesses), // Avg Time
      params, // Params
      stats.correctGuesses // Correct Guesses
    ];
  });
};