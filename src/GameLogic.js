import constants from './constants';
import { updateLeaderboardData } from './dbLogic';

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
 * @param {Function} setModelStats - Function to set the model statistics.
 */
export const startGame = (setGameStartTime, setPredictions, setGameState, setModelStats) => {
  setGameStartTime(performance.now());
  setPredictions([]);
  setGameState('playing');

  // Reset lastPredictionTimeModel1 and lastPredictionTimeModel2
  setModelStats((prevStats) => ({
    ...prevStats,
    lastPredictionTimeModel1: performance.now(),
    lastPredictionTimeModel2: performance.now(),
  }));
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
export const endGame = async (setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, setModelStats, selectedModels, LeaderboardData) => {
  if (!cancelled) {
    addPrediction(false);
  }
  handleClearCanvas(true);
  setGameState(cancelled ? 'menu' : 'end');

  if (modelStats && LeaderboardData) {

    const endTime = performance.now();
    const avgTimeModel1 = modelStats.correctGuessesModel1 > 0 ? (endTime - modelStats.lastPredictionTimeModel1) / modelStats.correctGuessesModel1 / 1000 : 0;
    const avgTimeModel2 = modelStats.correctGuessesModel2 > 0 ? (endTime - modelStats.lastPredictionTimeModel2) / modelStats.correctGuessesModel2 / 1000 : 0;

    let updatedLeaderboardData = updateTableData(
      {
        ...modelStats,
        avgTimeModel1,
        avgTimeModel2,
      },
      selectedModels,
      LeaderboardData
    );

    // Sort updated leaderboard data by the highest ELO (assuming ELO is in the 4th column/index 3)
    updatedLeaderboardData = updatedLeaderboardData.sort((a, b) => b[3] - a[3]);
    setLeaderboardData(updatedLeaderboardData);

    try {
      await updateLeaderboardData(updatedLeaderboardData);
    } catch (error) {
      console.error('Error updating database:', error);
    }

    setModelStats((prevStats) => ({
      ...prevStats,
      correctGuessesModel1: 0,
      correctGuessesModel2: 0,
      lastPredictionTimeModel1: endTime,
      lastPredictionTimeModel2: endTime,
    }));
  } else {
    console.error('modelStats or LeaderboardData is undefined or has an incorrect structure');
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
    setGameStartTime((prev) => prev - constants.SKIP_PENALTY);
  }
  addPrediction(isCorrect);
  setTargetIndex((prev) => prev + 1);
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
    const target = targets[targetIndex];
    const predictedByModel1 = target === output1[0].label;
    const predictedByModel2 = target === output2[0].label;

    if (predictedByModel1 || predictedByModel2) {
      setModelStats((prevStats) => {
        const currentTime = performance.now();
        let avgPredictionTimeModel1 = prevStats.avgPredictionTimeModel1;
        let avgPredictionTimeModel2 = prevStats.avgPredictionTimeModel2;

        if (predictedByModel1) {
          const timeDiff = (currentTime - prevStats.lastPredictionTimeModel1) / 1000;
          avgPredictionTimeModel1 = (prevStats.avgPredictionTimeModel1 * prevStats.correctGuessesModel1 + timeDiff) / (prevStats.correctGuessesModel1 + 1);
        }

        if (predictedByModel2) {
          const timeDiff = (currentTime - prevStats.lastPredictionTimeModel2) / 1000;
          avgPredictionTimeModel2 = (prevStats.avgPredictionTimeModel2 * prevStats.correctGuessesModel2 + timeDiff) / (prevStats.correctGuessesModel2 + 1);
        }

        return {
          ...prevStats,
          correctGuessesModel1: predictedByModel1 ? prevStats.correctGuessesModel1 + 1 : prevStats.correctGuessesModel1,
          correctGuessesModel2: predictedByModel2 ? prevStats.correctGuessesModel2 + 1 : prevStats.correctGuessesModel2,
          lastPredictionTimeModel1: predictedByModel1 ? currentTime : currentTime,
          lastPredictionTimeModel2: predictedByModel2 ? currentTime : currentTime,
          avgPredictionTimeModel1,
          avgPredictionTimeModel2,
        };
      });

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
 * Updates the leaderboard data with new model statistics.
 * @param {Object} modelStats - Statistics of the models.
 * @param {Array} selectedModels - Array of selected model names.
 * @param {Array} LeaderboardData - Array of leaderboard data.
 * @returns {Array} - Updated leaderboard data.
 */
export const updateTableData = (modelStats, selectedModels, LeaderboardData) => {
  const modelStatsMap = {};
  const model1 = selectedModels[0];
  const model2 = selectedModels[1];

  const calculateElo = (currentElo, opponentElo, score) => {
    let K;
    if (currentElo < 2100) {
      K = 32;  // use higher k-factor for less experienced players
    } else if (currentElo >= 2100 && currentElo < 2400) {
      K = 24;  // medium k-factor for moderately experienced players
    } else {
      K = 16;  // lower k-factor for highly experienced players
    }
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
    return Math.floor(currentElo + K * (score - expectedScore));
  };

  const model1Elo = LeaderboardData.find(row => row[2] === constants.MODELNAMEMAP[model1])[3];
  const model2Elo = LeaderboardData.find(row => row[2] === constants.MODELNAMEMAP[model2])[3];

  const model1Score = modelStats.correctGuessesModel1 > modelStats.correctGuessesModel2 ? 1 : (modelStats.correctGuessesModel1 < modelStats.correctGuessesModel2 ? 0 : 0.5);
  const model2Score = 1 - model1Score;

  const newModel1Elo = calculateElo(model1Elo, model2Elo, model1Score);
  const newModel2Elo = calculateElo(model2Elo, model1Elo, model2Score);

  modelStatsMap[model1] = {
    correctGuesses: modelStats.correctGuessesModel1,
    avgTime: modelStats.avgPredictionTimeModel1,
    lastPredictionTime: modelStats.lastPredictionTimeModel1,
    elo: newModel1Elo
  };
  modelStatsMap[model2] = {
    correctGuesses: modelStats.correctGuessesModel2,
    avgTime: modelStats.avgPredictionTimeModel2,
    lastPredictionTime: modelStats.lastPredictionTimeModel2,
    elo: newModel2Elo
  };

  const calculateAvgTime = (prevAvgTime, prevCorrectGuesses, newAvgTime, newCorrectGuesses) => {
    const totalPrevTime = prevAvgTime * prevCorrectGuesses;
    const totalNewTime = newAvgTime * newCorrectGuesses;
    const totalCorrectGuesses = prevCorrectGuesses + newCorrectGuesses;
    return totalCorrectGuesses ? ((totalPrevTime + totalNewTime) / totalCorrectGuesses).toFixed(2) : prevAvgTime.toFixed(2);
  };

  const updatedLeaderboardData = LeaderboardData.map((row) => {
    const [id, rank, model, elo, avgTime, params, correctGuesses] = row;
    if (model === constants.MODELNAMEMAP[model1]) {
      const newAvgTime = calculateAvgTime(
        parseFloat(avgTime),
        correctGuesses,
        modelStatsMap[model1].avgTime,
        modelStatsMap[model1].correctGuesses
      );
      return [
        id,
        rank,
        model,
        modelStatsMap[model1].elo,
        newAvgTime,
        params,
        correctGuesses + modelStatsMap[model1].correctGuesses
      ];
    } else if (model === constants.MODELNAMEMAP[model2]) {
      const newAvgTime = calculateAvgTime(
        parseFloat(avgTime),
        correctGuesses,
        modelStatsMap[model2].avgTime,
        modelStatsMap[model2].correctGuesses
      );
      return [
        id,
        rank,
        model,
        modelStatsMap[model2].elo,
        newAvgTime,
        params,
        correctGuesses + modelStatsMap[model2].correctGuesses
      ];
    } else {
      return row;
    }
  });

  return updatedLeaderboardData;
};
