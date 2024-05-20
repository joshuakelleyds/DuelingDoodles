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

  const initialLeaderboardData = constants.MODELPATHS.map((model, index) => [
    index + 1, // rank
    constants.MODELNAMEMAP[model], // model
    1000, // elo
    0, // avg time
    constants.MODELPARAMS[model], // params
    0, // correct guesses
  ]);

  const [LeaderboardData, setLeaderboardData] = useState(initialLeaderboardData);

  const initialModelStats = {
    correctGuessesModel1: 0,
    correctGuessesModel2: 0,
    lastPredictionTimeModel1: 0,
    lastPredictionTimeModel2: 0,
  };

  const [modelStats, setModelStats] = useState(initialModelStats);
  
  const selectedModelsRef = useRef([]);
  const worker1 = useRef(null);
  const worker2 = useRef(null);
  const canvasRef = useRef(null);

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
    endGame(setGameState, addPrediction, handleClearCanvas, cancelled, setLeaderboardData, modelStats, setModelStats, selectedModelsRef.current, LeaderboardData);
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
      startGame(setGameStartTime, setPredictions, setGameState);
    }
  }, [gameState, countdown]);

  const addPrediction = useCallback(
    (isCorrect) => {
      const image = canvasRef.current.getCanvasData();
      setPredictions((prev) => [
        ...prev,
        {
          output1: output1?.[0] ?? null,
          output2: output2?.[0] ?? null,
          image: image,
          correct: isCorrect,
          target: targets[targetIndex],
        },
      ]);
    },
    [output1, output2, targetIndex, targets]
  );

  useEffect(() => {
    checkGameOver(setGameState, gameState, gameCurrentTime, gameStartTime, endGame, setLeaderboardData, modelStats, setModelStats, addPrediction, handleClearCanvas, false, selectedModelsRef.current, LeaderboardData);
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

  const initialTableData = [
    [1, 'MobileVIT-V2-1.0', 0, 10, '4.58M', '1000',],
    [2, 'MobileVIT-V2-0.5', 0.6, 70.18, '1.37M', '1000'],
    [3, 'MobileViT-XXS', 1.3, 69.03, '1.28M', '1000'],
    [4, 'MobileVIT-XS', 2.3, 74.76, '2.33M', '1000'],
    [5, 'MobileVIT-S', 5.6, 78.36, '5.59M', '1000'],
    [6, 'CrossViT-15', 27.4, 81.95, '27.37M', '1000'],
    [7, 'CrossViT-18', 43.2, 82.29, '43.21M', '1000'],
  ];

  // function to get a specific column
  const getColumn = (data, colIndex) => data.map(row => row[colIndex]);

  // extracting columns using the getColumn function
  const col1 = getColumn(LeaderboardData, 0);
  const col2 = getColumn(LeaderboardData, 1);
  const col3 = getColumn(LeaderboardData, 2);
  const col4 = getColumn(LeaderboardData, 3);
  const col5 = getColumn(LeaderboardData, 4);
  const col6 = getColumn(LeaderboardData, 5);

  // new column names
  const colNames = ['Rank', 'Model', 'ELO', 'Avg Time', 'Params'];

  const chartOptions = constants.chartOptionsArray.reduce((acc, chart) => {
    acc[chart.type] = chart.options;
    return acc;
  }, {});

  return (
    <>
      {/* the canvas */}
      <div className={`h-full w-full top-0 left-0 absolute ${isPlaying ? '' : 'pointer-events-none'}`}>
        <SketchCanvas
          onSketchChange={() => {
            setSketchHasChanged(true);
          }}
          ref={canvasRef}
        />
      </div>

      {/* the main menu */}
      <AnimatePresence initial={false} mode='wait'>
        {menuVisible && (
          <Menu
            gameState={gameState}
            onClick={handleMainClick}
            onLeaderboardClick={handleLeaderboardClick}
          />
        )}
      </AnimatePresence>

      {/* the countdown screen */}
      <AnimatePresence initial={false} mode='wait'>
        {countdownVisible && <Countdown countdown={countdown} />}
      </AnimatePresence>

      {/* the game over screen */}
      <AnimatePresence initial={false} mode='wait'>
        {gameOver && <GameOver predictions={predictions} onClick={handleGameOverClick} />}
      </AnimatePresence>

      {/* the leaderboard */}
      <AnimatePresence initial={false} mode='wait'>
        {isLeaderboardVisible && (
          <Leaderboard
            LeaderboardData={LeaderboardData}
            colNames={constants.colNames}
            tableStyleOptions={constants.tableStyleOptionsArray[0]}
            chartOptions={chartOptions}
            numGraphs={3}
            onClose={handleLeaderboardClick}
            barData={[col2, col3]}
            barHData={[col2, col3]}
            pieData={[col2, col4]}
            donutData={[col2, col4]}
            scatterData={[col3, col6]}
            graphTypes={["bar", "barH", "scatter"]}
          />
        )}
      </AnimatePresence>
      {/* the game UI */}
      {isPlaying && gameCurrentTime !== null && targets && (
        <div className='absolute top-5 text-center'>
          <h2 className='text-4xl'>Draw &quot;{targets[targetIndex]}&quot;</h2>
          <h3 className='text-2xl'>
            {formatTime(Math.max(constants.GAME_DURATION - (gameCurrentTime - gameStartTime) / 1000, 0))}
          </h3>
        </div>
      )}
      {/* the game controls */}
      {isPlaying && (
      <>
      {/* displaying the prediction charts */}
      <div className="absolute left-0 top-0">
      <PredictionChart predictions={graphOutput1} i={1} />
      </div>
      <div className="absolute right-0 top-0">
        <PredictionChart predictions={graphOutput2} i={2}/>
      </div>
      <div className="absolute bottom-5 text-center w-full">
        {/* displaying the predictions in text*/}
        <div className="flex justify-center gap-20 mb-5">
          <div className="flex flex-col items-center justify-center w-1/4">
            <h1 className="text-2xl font-bold text-center">{output1 && output1[0] && (<>{constants.MODELNAMEMAP[selectedModelsRef.current[0]]}<br />Prediction: {output1[0].label} ({(100 * output1[0].score).toFixed(1)}%)</>)}</h1>
          </div>

          <div className="flex flex-col items-center justify-center w-1/4">
            <h1 className="text-2xl font-bold text-center">{output2 && output2[0] && (<>{constants.MODELNAMEMAP[selectedModelsRef.current[1]]}<br />Prediction: {output2[0].label} ({(100 * output2[0].score).toFixed(1)}%)</>)}</h1>
          </div>
        </div>
        {/* buttons to handle clear, skip, and exit*/}
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-2 bg-blue-200 text-[#555555] text-xl rounded-lg hover:bg-blue-300" onClick={handleClearCanvas}>Clear</button>
          <button className="px-6 py-2 bg-green-200 text-[#555555] text-xl rounded-lg hover:bg-green-300" onClick={() => goToNextWord(addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, false, setGameStartTime)}>Skip</button>
          <button className="px-6 py-2 bg-purple-200 text-[#555555] text-xl rounded-lg hover:bg-purple-300" onClick={() => handleEndGame(true)}>Exit</button>
        </div>
      </div>
    </>
  )}
</>
);
}
export default App;
