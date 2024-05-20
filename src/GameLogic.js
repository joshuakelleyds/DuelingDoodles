import constants from './constants';

/**
 * Formats time in seconds to mm:ss format.
 * @param {number} seconds - Time in seconds.
 * @returns {string} - Formatted time as mm:ss.
 */
export const formatTime = (seconds) => {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Shuffles the elements of an array in place.
 * @param {Array} array - The array to shuffle.
 */
export const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Filters out banned labels and adjusts scores based on time spent drawing.
 * @param {Array} data - Array of score objects.
 * @param {number} timeSpentDrawing - Time spent drawing in milliseconds.
 * @returns {Array} - Filtered and adjusted scores.
 */
export const filterAndAdjustScores = (data, timeSpentDrawing) => {
  if (!data || data.length === 0) {
    return [];
  }

  // filter out banned labels
  const filteredResult = data.filter(
    (x) => !constants.BANNED_LABELS.includes(x.label)
  );

  // apply easy mode adjustment
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

  // normalize scores
  const sum = filteredResult.reduce((acc, x) => acc + x.score, 0);
  filteredResult.forEach((x) => (x.score /= sum));
  
  return filteredResult;
};

/**
 * Creates two web workers for parallel processing.
 * @param {string} modelName1 - Name of the first model.
 * @param {string} modelName2 - Name of the second model.
 * @returns {Object|null} - An object containing the two workers, or null if there was an error.
 */
export const createWorkers = (modelName1, modelName2) => {
  try {
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

/**
 * Starts the countdown timer and sets the game state to 'countdown'.
 * @param {Function} setCountdown - Function to update the countdown state.
 * @param {Function} setGameState - Function to update the game state.
 * @returns {Function} - Function to clear the countdown timer.
 */
export const startCountdown = (setCountdown, setGameState) => {
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

/**
 * Starts the game by setting the start time, resetting predictions, and setting the game state to 'playing'.
 * @param {Function} setGameStartTime - Function to set the game start time.
 * @param {Function} setPredictions - Function to set the predictions state.
 * @param {Function} setGameState - Function to set the game state.
 */
export const startGame = (setGameStartTime, setPredictions, setGameState) => {
  setGameStartTime(performance.now());
  setPredictions([]);
  setGameState('playing');
};

/**
 * Ends the game by adding a final prediction (if not cancelled), clearing the canvas, and setting the game state to 'menu' or 'end'.
 * @param {Function} setGameState - Function to set the game state.
 * @param {Function} addPrediction - Function to add a prediction.
 * @param {Function} handleClearCanvas - Function to clear the canvas.
 * @param {boolean} cancelled - Whether the game was cancelled.
 * @param {Function} setLeaderboardData - Function to set the leaderboard data.
 * @param {Object} modelStats - Statistics of the models.
 * @param {Function} setModelStats - Function to set the model statistics.
 * @param {Array} selectedModels - Array of selected model names.
 * @param {Array} LeaderboardData - Array of leaderboard data.
 */
export const endGame = (setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, setModelStats, selectedModels, LeaderboardData) => {
  if (!cancelled) {
    addPrediction(false);
  }
  handleClearCanvas(true);
  setGameState(cancelled ? 'menu' : 'end');
  
  // make sure modelStats is defined and has the correct structure
  if (modelStats && modelStats.correctGuessesModel1 !== undefined && modelStats.correctGuessesModel2 !== undefined && LeaderboardData) {
    // calculate and update leaderboard data
    const updatedLeaderboardData = updateTableData(modelStats, selectedModels, LeaderboardData);
    setLeaderboardData(updatedLeaderboardData);
  } else {
    console.error('modelStats is undefined or has an incorrect structure, or LeaderboardData is undefined');
  }
};

/**
 * Advances to the next word.
 * @param {Function} addPrediction - Function to add a prediction.
 * @param {Function} setTargetIndex - Function to set the target index.
 * @param {Function} setOutput1 - Function to set the output of the first model.
 * @param {Function} setOutput2 - Function to set the output of the second model.
 * @param {Function} setSketchHasChanged - Function to set whether the sketch has changed.
 * @param {Function} handleClearCanvas - Function to clear the canvas.
 * @param {boolean} isCorrect - Whether the guess was correct.
 * @param {Function} setGameStartTime - Function to set the game start time.
 */
export const goToNextWord = (addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, isCorrect, setGameStartTime) => {
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

/**
 * Checks if the game is over based on the elapsed time and ends the game if necessary.
 * @param {Function} setGameState - Function to set the game state.
 * @param {string} gameState - The current game state.
 * @param {number} gameCurrentTime - The current game time.
 * @param {number} gameStartTime - The game start time.
 * @param {Function} endGame - Function to end the game.
 * @param {Function} setLeaderboardData - Function to set the leaderboard data.
 * @param {Object} modelStats - Statistics of the models.
 * @param {Function} setModelStats - Function to set the model statistics.
 * @param {Function} addPrediction - Function to add a prediction.
 * @param {Function} handleClearCanvas - Function to clear the canvas.
 * @param {boolean} cancelled - Whether the game was cancelled.
 * @param {Array} selectedModels - Array of selected model names.
 * @param {Array} LeaderboardData - Array of leaderboard data.
 */
export const checkGameOver = (setGameState, gameState, gameCurrentTime, gameStartTime, endGame, setLeaderboardData, modelStats, setModelStats, addPrediction, handleClearCanvas, cancelled, selectedModels, LeaderboardData) => {
  if (
    gameState === 'playing' &&
    gameCurrentTime !== null &&
    gameStartTime !== null &&
    (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION
  ) {
    endGame(setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, setModelStats, selectedModels, LeaderboardData);
  }
};

/**
 * Checks if the current word has been guessed correctly.
 * @param {string} gameState - The current game state.
 * @param {Array} output1 - The output of the first model.
 * @param {Array} output2 - The output of the second model.
 * @param {Array} targets - Array of target words.
 * @param {number} targetIndex - The current target index.
 * @param {Function} goToNextWord - Function to advance to the next word.
 * @param {Function} addPrediction - Function to add a prediction.
 * @param {Function} setTargetIndex - Function to set the target index.
 * @param {Function} setOutput1 - Function to set the output of the first model.
 * @param {Function} setOutput2 - Function to set the output of the second model.
 * @param {Function} setSketchHasChanged - Function to set whether the sketch has changed.
 * @param {Function} handleClearCanvas - Function to clear the canvas.
 * @param {Function} setGameStartTime - Function to set the game start time.
 * @param {Object} modelStats - Statistics of the models.
 * @param {Function} setModelStats - Function to set the model statistics.
 */
export const checkWordGuessed = (gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime, modelStats, setModelStats) => {
  if (gameState === 'playing' && output1 !== null && output2 !== null && targets !== null) {
    const target = targets[targetIndex]; // get the current target word
    const predictedByModel1 = target === output1[0].label; // check if model 1 predicted correctly
    const predictedByModel2 = target === output2[0].label; // check if model 2 predicted correctly

    if (predictedByModel1 || predictedByModel2) { // if either model predicted correctly
      // update model stats
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

/**
 * Runs the game loop, triggering classification if the sketch has changed and updating the current time.
 * @param {string} gameState - The current game state.
 * @param {boolean} isPredicting1 - Whether the first model is predicting.
 * @param {boolean} isPredicting2 - Whether the second model is predicting.
 * @param {boolean} sketchHasChanged - Whether the sketch has changed.
 * @param {Function} classify - Function to classify the sketch.
 * @param {Function} setSketchHasChanged - Function to set whether the sketch has changed.
 * @param {Function} setGameCurrentTime - Function to set the current game time.
 * @returns {Function} - Function to clear the interval.
 */
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

/**
 * Updates the leaderboard data with the new stats for the selected models.
 * @param {Object} modelStats - Statistics of the models.
 * @param {Array} selectedModels - Array of selected model names.
 * @param {Array} LeaderboardData - Array of leaderboard data.
 * @returns {Array} - Updated leaderboard data.
 */
export const updateTableData = (modelStats, selectedModels, LeaderboardData) => {
  const modelStatsMap = {}; // map to store model stats

  const model1 = selectedModels[0];
  const model2 = selectedModels[1];

  // calculate ELO ratings based on match outcome and correct guesses
  const calculateElo = (currentElo, opponentElo, score) => {
    const K = 32; // K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
    return currentElo + K * (score - expectedScore);
  };

  // get initial ELOs from leaderboard
  const model1Elo = LeaderboardData.find(row => row[1] === constants.MODELNAMEMAP[model1])[2];
  const model2Elo = LeaderboardData.find(row => row[1] === constants.MODELNAMEMAP[model2])[2];

  // calculate match outcome: 1 if model1 wins, 0 if model2 wins, 0.5 for a draw
  const model1Score = modelStats.correctGuessesModel1 > modelStats.correctGuessesModel2 ? 1 : (modelStats.correctGuessesModel1 < modelStats.correctGuessesModel2 ? 0 : 0.5);
  const model2Score = 1 - model1Score;

  // update ELO ratings
  const newModel1Elo = calculateElo(model1Elo, model2Elo, model1Score);
  const newModel2Elo = calculateElo(model2Elo, model1Elo, model2Score);

  // populate model stats map
  modelStatsMap[model1] = {
    correctGuesses: modelStats.correctGuessesModel1,
    lastPredictionTime: modelStats.lastPredictionTimeModel1,
    elo: newModel1Elo
  };
  modelStatsMap[model2] = {
    correctGuesses: modelStats.correctGuessesModel2,
    lastPredictionTime: modelStats.lastPredictionTimeModel2,
    elo: newModel2Elo
  };

  // calculate average time between predictions
  const calculateAvgTime = (lastPredictionTime, correctGuesses) => {
    const totalTime = lastPredictionTime ? (Date.now() - new Date(lastPredictionTime)) / 1000 : 0;
    return (totalTime / correctGuesses).toFixed(2);
  };

  // update the LeaderboardData array with the new stats for the selected models
  const updatedLeaderboardData = LeaderboardData.map((row) => {
    const [rank, model, elo, avgTime, params, correctGuesses] = row;
    if (model === constants.MODELNAMEMAP[model1]) {
      return [
        rank,
        model,
        modelStatsMap[model1].elo,
        calculateAvgTime(modelStatsMap[model1].lastPredictionTime, modelStatsMap[model1].correctGuesses),
        params,
        modelStatsMap[model1].correctGuesses
      ];
    } else if (model === constants.MODELNAMEMAP[model2]) {
      return [
        rank,
        model,
        modelStatsMap[model2].elo,
        calculateAvgTime(modelStatsMap[model2].lastPredictionTime, modelStatsMap[model2].correctGuesses),
        params,
        modelStatsMap[model2].correctGuesses
      ];
    } else {
      return row;
    }
  });

  return updatedLeaderboardData;
};