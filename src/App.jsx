import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import SketchCanvas from './components/SketchCanvas';
import constants from './constants';
import Menu from './components/Menu';
import GameOver from './components/GameOver';
import Countdown from './components/Countdown';
import { AnimatePresence } from 'framer-motion';
import PredictionChart from './components/PredictionChart';
import Leaderboard from './components/Leaderboard';
import { formatTime, shuffleArray, filterAndAdjustScores, createWorkers, startCountdown, startGame, endGame, goToNextWord, checkGameOver, checkWordGuessed, gameLoop, updateTableData } from './GameLogic';
import { fetchLeaderboardData, updateLeaderboardData } from './dbLogic';

function App() {
  // state variables
  const [ready, setReady] = useState(false);
  const [worker1Ready, setWorker1Ready] = useState(false);
  const [worker2Ready, setWorker2Ready] = useState(false);
  const [gameState, setGameState] = useState('menu');
  const [countdown, setCountdown] = useState(constants.COUNTDOWN_TIMER);
  const [gameCurrentTime, setGameCurrentTime] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [output1, setOutput1] = useState(null);
  const [isPredicting1, setIsPredicting1] = useState(false);
  const [output2, setOutput2] = useState(null);
  const [isPredicting2, setIsPredicting2] = useState(false);
  const [sketchHasChanged, setSketchHasChanged] = useState(false);
  const [targets, setTargets] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [graphOutput1, setGraphOutput1] = useState(null);
  const [graphOutput2, setGraphOutput2] = useState(null);
  const [graphUpdateCount1, setGraphUpdateCount1] = useState(0);
  const [graphUpdateCount2, setGraphUpdateCount2] = useState(0);
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);
  const [modelColumn, setModelColumn] = useState([]);
  const [eloColumn, setEloColumn] = useState([]);
  const [avgTimeColumn, setAvgTimeColumn] = useState([]);
  const [paramsColumn, setParamsColumn] = useState([]);
  const [correctGuessesColumn, setCorrectGuessesColumn] = useState([]);
  const [LeaderboardData, setLeaderboardData] = useState([]);

  const selectedModelsRef = useRef([]);
  const worker1 = useRef(null);
  const worker2 = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // fetch leaderboard data on component mount
    const fetchData = async () => {
      let data = await fetchLeaderboardData();
      // sort data by the highest ELO (assuming ELO is in the 4th column/index 3)
      data = data.sort((a, b) => b[3] - a[3]);
      setLeaderboardData(data);
    };

    fetchData();
  }, []);

  useEffect(() => {
    // transform and set leaderboard data columns when data changes
    if (LeaderboardData.length > 0) {
      const columns = LeaderboardData[0].map((_, colIndex) =>
        LeaderboardData.map(row => row[colIndex])
      );
      setModelColumn(columns[2]);
      setEloColumn(columns[3]);
      setAvgTimeColumn(columns[4].map(time => parseFloat(time)));
      
      // convert params column to actual numeric values
      const paramsColumnNumeric = columns[5].map(param => {
        const numericValue = parseFloat(param);
        return isNaN(numericValue) ? 0 : numericValue * 1;
      });
      setParamsColumn(paramsColumnNumeric);
      setCorrectGuessesColumn(columns[6]);
    }
  }, [LeaderboardData]);

  const initialModelStats = {
    correctGuessesModel1: 0,
    correctGuessesModel2: 0,
    lastPredictionTimeModel1: 0,
    lastPredictionTimeModel2: 0,
    avgPredictionTimeModel1: 0,
    avgPredictionTimeModel2: 0,
  };
  const [modelStats, setModelStats] = useState(initialModelStats);

  useEffect(() => {
    // select two random models from the modelPaths array
    const randomIndex1 = Math.floor(Math.random() * constants.MODELPATHS.length);
    let randomIndex2 = Math.floor(Math.random() * constants.MODELPATHS.length);
  
    // ensure that the second index is different from the first index
    while (randomIndex2 === randomIndex1) {
      randomIndex2 = Math.floor(Math.random() * constants.MODELPATHS.length);
    }
  
    const [model1, model2] = [constants.MODELPATHS[randomIndex1], constants.MODELPATHS[randomIndex2]];
    selectedModelsRef.current = [model1, model2];
  }, []);

  useEffect(() => {
    // create worker instances
    const { worker1: createdWorker1, worker2: createdWorker2 } = createWorkers(selectedModelsRef.current[0], selectedModelsRef.current[1]);
    worker1.current = createdWorker1;
    worker2.current = createdWorker2;

    // message handler for worker 1
    const onMessageReceived1 = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
          setWorker1Ready(true);
          break;

        case 'update':
          // not used in this code, but can be used for real-time updates from worker1
          break;

        case 'result':
          setIsPredicting1(false);
          const filteredResult1 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput1(filteredResult1);
          setGraphUpdateCount1((prevCount) => prevCount + 1);
          break;
      }
    };

    // message handler for worker 2
    const onMessageReceived2 = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
          setWorker2Ready(true);
          break;

        case 'update':
          // not used in this code, but can be used for real-time updates from worker2
          break;

        case 'result':
          setIsPredicting2(false);
          const filteredResult2 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput2(filteredResult2);
          setGraphUpdateCount2((prevCount) => prevCount + 1);
          break;
      }
    };

    // add message event listeners to workers
    worker1.current.addEventListener('message', onMessageReceived1);
    worker2.current.addEventListener('message', onMessageReceived2);

    // cleanup function to remove event listeners when component unmounts
    return () => {
      worker1.current.removeEventListener('message', onMessageReceived1);
      worker2.current.removeEventListener('message', onMessageReceived2);
    };
  }, []);

  useEffect(() => {
    // set ready state when both workers are ready
    if (worker1Ready && worker2Ready) {
      setReady(true);
      beginCountdown();
    }
  }, [worker1Ready, worker2Ready]);

  // update graph outputs every 10 changes or 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setGraphOutput1(output1);
    }, 200);

    if (graphUpdateCount1 % 10 === 0) {
      setGraphOutput1(output1);
      clearTimeout(timer);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [graphUpdateCount1, output1]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGraphOutput2(output2);
    }, 200);

    if (graphUpdateCount2 % 10 === 0) {
      setGraphOutput2(output2);
      clearTimeout(timer);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [graphUpdateCount2, output2]);

  const classify = useCallback(() => {
    if (canvasRef.current) {
      const image = canvasRef.current.getCanvasData();
      if (image !== null) {
        // send classification request to worker 1
        if (worker1.current) {
          setIsPredicting1(true);
          worker1.current.postMessage({ action: 'classify', image });
        }
        // send classification request to worker 2
        if (worker2.current) {
          setIsPredicting2(true);
          worker2.current.postMessage({ action: 'classify', image });
        }
      }
    }
  }, []);

  const handleEndGame = (cancelled = false) => {
    endGame(setGameState, addPrediction, handleClearCanvas, cancelled, (updatedLeaderboardData) => {
      // sort updated leaderboard data by the highest ELO (assuming ELO is in the 4th column/index 3)
      const sortedData = updatedLeaderboardData.sort((a, b) => b[3] - a[3]);
      setLeaderboardData(sortedData);
    }, modelStats, setModelStats, selectedModelsRef.current, LeaderboardData);
  };

  const handleClearCanvas = (resetTimeSpentDrawing = false) => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas(resetTimeSpentDrawing);
    }
  };

  const beginCountdown = () => {
    startCountdown(setCountdown, setGameState);
    // generate possible labels for the game
    const possibleLabels = Object.values(constants.LABELS).filter(
      (x) => !constants.BANNED_LABELS.includes(x)
    );
    // shuffle the labels
    shuffleArray(possibleLabels);
    // set the targets and target index
    setTargets(possibleLabels);
    setTargetIndex(0);
  };

  const handleMainClick = () => {
    if (!ready) {
      // if not ready, set game state to loading and load the workers
      setGameState('loading');
      worker1.current.postMessage({ action: 'load' });
      worker2.current.postMessage({ action: 'load' });
    } else {
      // if ready, begin the countdown
      beginCountdown();
    }
  };

  const handleLeaderboardClick = () => {
    setIsLeaderboardVisible((prevState) => !prevState);
  };

  const handleGameOverClick = (playAgain) => {
    if (playAgain) {
      // if playing again, begin the countdown
      beginCountdown();
    } else {
      // if not playing again, end the game
      handleEndGame(true);
    }
  };

  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
      startGame(setGameStartTime, setPredictions, setGameState, setModelStats);
    }
  }, [gameState, countdown]);

  const addPrediction = useCallback(
    (isCorrect) => {
      const image = canvasRef.current.getCanvasData();
      const model1Name = constants.MODELNAMEMAP[selectedModelsRef.current[0]];
      const model2Name = constants.MODELNAMEMAP[selectedModelsRef.current[1]];
      setPredictions((prev) => [
        ...prev,
        {
          output1: output1?.[0] ?? null,
          output2: output2?.[0] ?? null,
          image: image,
          correct: isCorrect,
          target: targets[targetIndex],
          model1Name: model1Name,
          model2Name: model2Name,
        },
      ]);
    },
    [output1, output2, targetIndex, targets]
  );

  useEffect(() => {
    checkGameOver(setGameState, gameState, gameCurrentTime, gameStartTime, endGame, (updatedLeaderboardData) => {
      // sort updated leaderboard data by the highest ELO (assuming ELO is in the 4th column/index 3)
      const sortedData = updatedLeaderboardData.sort((a, b) => b[3] - a[3]);
      setLeaderboardData(sortedData);
    }, modelStats, setModelStats, addPrediction, handleClearCanvas, false, selectedModelsRef.current, LeaderboardData);
  }, [gameState, gameCurrentTime, gameStartTime, modelStats, selectedModelsRef, LeaderboardData]);

  useEffect(() => {
    checkWordGuessed(gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime, modelStats, setModelStats);
  }, [gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime, modelStats, setModelStats]);

  useEffect(() => {
    const cleanup = gameLoop(gameState, isPredicting1, isPredicting2, sketchHasChanged, classify, setSketchHasChanged, setGameCurrentTime);
    return cleanup;
  }, [gameState, isPredicting1, isPredicting2, sketchHasChanged, classify]);

  useEffect(() => {
    if (gameState === 'playing') {
      const preventDefault = (e) => e.preventDefault();
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventDefault, { passive: false });
      };
    }
  }, [gameState]);

  // determine which components should be visible based on game state
  const menuVisible = gameState === 'menu' || gameState === 'loading';
  const isPlaying = gameState === 'playing';
  const countdownVisible = gameState === 'countdown';
  const gameOver = gameState === 'end';

  const chartOptions = constants.chartOptionsArray.reduce((acc, chart) => {
    acc[chart.type] = chart.options;
    return acc;
  }, {});

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        className: `h-full w-full top-0 left-0 absolute ${
          isPlaying ? "" : "pointer-events-none"
        }`,
      },
      React.createElement(SketchCanvas, {
        onSketchChange: () => {
          setSketchHasChanged(true);
        },
        ref: canvasRef,
      })
    ),
    React.createElement(
      AnimatePresence,
      { initial: false, mode: "wait" },
      menuVisible &&
        React.createElement(Menu, {
          gameState: gameState,
          onClick: handleMainClick,
          onLeaderboardClick: handleLeaderboardClick,
        })
    ),
    React.createElement(
      AnimatePresence,
      { initial: false, mode: "wait" },
      countdownVisible && React.createElement(Countdown, { countdown: countdown })
    ),
    React.createElement(
      AnimatePresence,
      { initial: false, mode: "wait" },
      gameOver &&
        React.createElement(GameOver, {
          predictions: predictions,
          onClick: handleGameOverClick,
        })
    ),
    React.createElement(
      AnimatePresence,
      { initial: false, mode: "wait" },
      isLeaderboardVisible &&
        React.createElement(Leaderboard, {
          LeaderboardData: LeaderboardData,
          colNames: constants.colNames,
          tableStyleOptions: constants.tableStyleOptionsArray[0],
          chartOptions: chartOptions,
          numGraphs: 3,
          onClose: handleLeaderboardClick,
          barData: [modelColumn, correctGuessesColumn],
          barHData: [modelColumn, eloColumn],
          pieData: [modelColumn, avgTimeColumn],
          donutData: [modelColumn, avgTimeColumn],
          scatterData: [paramsColumn, avgTimeColumn],
          graphTypes: ["bar", "barH", "scatter"],
        })
    ),
    isPlaying &&
      gameCurrentTime !== null &&
      targets &&
      React.createElement(
        "div",
        { className: "absolute top-5 text-center" },
        React.createElement(
          "h2",
          { className: "text-4xl" },
          'Draw "',
          targets[targetIndex],
          '"'
        ),
        React.createElement(
          "h3",
          { className: "text-2xl" },
          formatTime(
            Math.max(
              constants.GAME_DURATION - (gameCurrentTime - gameStartTime) / 1000,
              0
            )
          )
        )
      ),
    isPlaying &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          { className: "absolute left-0 top-0" },
          React.createElement(PredictionChart, {
            predictions: graphOutput1,
            i: 1,
          })
        ),
        React.createElement(
          "div",
          { className: "absolute right-0 top-0" },
          React.createElement(PredictionChart, {
            predictions: graphOutput2,
            i: 2,
          })
        ),
        React.createElement(
          "div",
          { className: "absolute bottom-5 text-center w-full" },
          React.createElement(
            "div",
            { className: "flex justify-center gap-20 mb-5" },
            React.createElement(
              "div",
              { className: "flex flex-col items-center justify-center w-1/4" },
              React.createElement(
                "h1",
                { className: "text-2xl font-bold text-center" },
                output1 &&
                  output1[0] &&
                  React.createElement(
                    React.Fragment,
                    null,
                    constants.MODELNAMEMAP[selectedModelsRef.current[0]],
                    React.createElement("br", null),
                    "Prediction: ",
                    output1[0].label,
                    " (",
                    (100 * output1[0].score).toFixed(1),
                    "%)"
                  )
              )
            ),
            React.createElement(
              "div",
              { className: "flex flex-col items-center justify-center w-1/4" },
              React.createElement(
                "h1",
                { className: "text-2xl font-bold text-center" },
                output2 &&
                  output2[0] &&
                  React.createElement(
                    React.Fragment,
                    null,
                    constants.MODELNAMEMAP[selectedModelsRef.current[1]],
                    React.createElement("br", null),
                    "Prediction: ",
                    output2[0].label,
                    " (",
                    (100 * output2[0].score).toFixed(1),
                    "%)"
                  )
              )
            )
          ),
          React.createElement(
            "div",
            { className: "flex gap-4 justify-center" },
            React.createElement(
              "button",
              {
                className:
                  "px-6 py-2 bg-blue-200 text-[#555555] text-xl rounded-lg hover:bg-blue-300",
                onClick: handleClearCanvas,
              },
              "Clear"
            ),
            React.createElement(
              "button",
              {
                className:
                  "px-6 py-2 bg-green-200 text-[#555555] text-xl rounded-lg hover:bg-green-300",
                onClick: () =>
                  goToNextWord(
                    addPrediction,
                    setTargetIndex,
                    setOutput1,
                    setOutput2,
                    setSketchHasChanged,
                    handleClearCanvas,
                    false,
                    setGameStartTime
                  ),
              },
              "Skip"
            ),
            React.createElement(
              "button",
              {
                className:
                  "px-6 py-2 bg-purple-200 text-[#555555] text-xl rounded-lg hover:bg-purple-300",
                onClick: () => handleEndGame(true),
              },
              "Exit"
            )
          )
        )
      )
  );
}

export default App;