// App.js
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
import { formatTime, shuffleArray, filterAndAdjustScores, createWorkers, startCountdown, startGame, endGame, goToNextWord, checkGameOver, checkWordGuessed, gameLoop } from './GameLogic';

const modelPaths = [
  "JoshuaKelleyDs/quickdraw-MobileVIT-small-finetune",
  "JoshuaKelleyDs/quickdraw-MobileVIT-xxs-finetune",
  "JoshuaKelleyDs/quickdraw-DeiT-tiny-finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-2.0-Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-1.0-Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-1.0-Pretrained"
];

const modelNameMap = {
  "JoshuaKelleyDs/quickdraw-MobileVIT-small-finetune": "MobileVIT-V1-Small Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVIT-xxs-finetune": "MobileVIT-V1-XXS Finetune",
  "JoshuaKelleyDs/quickdraw-DeiT-tiny-finetune": "DeiT-Tiny Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-2.0-Finetune": "MobileVIT-V2-2.0 Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-1.0-Finetune": "MobileVIT-V2-1.0 Finetune",
  "JoshuaKelleyDs/quickdraw-MobileVITV2-1.0-Pretrained": "MobileVITV2-1.0 Pretrained"
};

function App() {
  // State variables
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
  
  const selectedModelsRef = useRef([]);
  const worker1 = useRef(null);
  const worker2 = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Shuffle model paths and select the first two
    const shuffledModelPaths = [...modelPaths];
    shuffleArray(shuffledModelPaths);
    const [model1, model2] = shuffledModelPaths.slice(0, 2);
    selectedModelsRef.current = [model1, model2];
  }, []);

  useEffect(() => {
    // Create worker instances
    const { worker1: createdWorker1, worker2: createdWorker2 } = createWorkers(selectedModelsRef.current[0], selectedModelsRef.current[1]);
    worker1.current = createdWorker1;
    worker2.current = createdWorker2;

    // Message handler for worker 1
    const onMessageReceived1 = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
          setWorker1Ready(true);
          break;

        case 'update':
          // Not used in this code, but can be used for real-time updates from worker1
          break;

        case 'result':
          setIsPredicting1(false);
          const filteredResult1 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput1(filteredResult1);
          setGraphUpdateCount1((prevCount) => prevCount + 1);
          break;
      }
    };

    // Message handler for worker 2
    const onMessageReceived2 = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
          setWorker2Ready(true);
          break;

        case 'update':
          // Not used in this code, but can be used for real-time updates from worker2
          break;

        case 'result':
          setIsPredicting2(false);
          const filteredResult2 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput2(filteredResult2);
          setGraphUpdateCount2((prevCount) => prevCount + 1);
          break;
      }
    };

    // Add message event listeners to workers
    worker1.current.addEventListener('message', onMessageReceived1);
    worker2.current.addEventListener('message', onMessageReceived2);

    // Cleanup function to remove event listeners when component unmounts
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

  // Update graph outputs every 10 changes or 2 seconds
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
        // Send classification request to worker 1
        if (worker1.current) {
          setIsPredicting1(true);
          worker1.current.postMessage({ action: 'classify', image });
        }
        // Send classification request to worker 2
        if (worker2.current) {
          setIsPredicting2(true);
          worker2.current.postMessage({ action: 'classify', image });
        }
      }
    }
  }, []);

  const handleEndGame = (cancelled = false) => {
    endGame(setGameState, addPrediction, handleClearCanvas, cancelled);
  };

  const handleClearCanvas = (resetTimeSpentDrawing = false) => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas(resetTimeSpentDrawing);
    }
  };

  const beginCountdown = () => {
    startCountdown(setCountdown, setGameState);
    // Generate possible labels for the game
    const possibleLabels = Object.values(constants.LABELS).filter(
      (x) => !constants.BANNED_LABELS.includes(x)
    );
    // Shuffle the labels
    shuffleArray(possibleLabels);
    // Set the targets and target index
    setTargets(possibleLabels);
    setTargetIndex(0);
  };

  const handleMainClick = () => {
    if (!ready) {
      // If not ready, set game state to loading and load the workers
      setGameState('loading');
      worker1.current.postMessage({ action: 'load' });
      worker2.current.postMessage({ action: 'load' });
    } else {
      // If ready, begin the countdown
      beginCountdown();
    }
  };

  const handleLeaderboardClick = () => {
    setIsLeaderboardVisible((prevState) => !prevState);
  };

  const handleGameOverClick = (playAgain) => {
    if (playAgain) {
      // If playing again, begin the countdown
      beginCountdown();
    } else {
      // If not playing again, end the game
      endGame(setGameState, addPrediction, handleClearCanvas, true);
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
    checkGameOver(gameState, gameCurrentTime, gameStartTime, handleEndGame);
  }, [gameState, gameCurrentTime, gameStartTime, handleEndGame]);

  useEffect(() => {
    checkWordGuessed(gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime);
  }, [gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime]);

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

  // Determine which components should be visible based on game state
  const menuVisible = gameState === 'menu' || gameState === 'loading';
  const isPlaying = gameState === 'playing';
  const countdownVisible = gameState === 'countdown';
  const gameOver = gameState === 'end';

  const initialTableData = [
    [1, 'MobileNet', 900, '2s', '1M'],
    [2, 'ResNet', 850, '2.2s', '2M'],
    [3, 'EfficientNet', 830, '2.5s', '1.5M'],
    [4, 'DenseNet', 800, '2.3s', '3M'],
    [5, 'Inception', 780, '2.7s', '4M'],
    [6, 'VGG', 770, '3s', '5M'],
  ];

  const models = initialTableData.map(row => row[1]);
  const eloValues = initialTableData.map(row => row[2]);

  const graphData = {
    bar: [models, eloValues],
    barh: [models, eloValues],
    barh2: [models, eloValues],
  };

  const tableStyleOptionsArray = [
    {
      headerColors: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
      cellColor: '#ffffff',
    },
    {
      headerColors:["#b3e2cd","#fdcdac","#cbd5e8","#f4cae4","#e6f5c9","#fff2ae","#f1e2cc","#cccccc"],
      cellColor: '#f7f7f7',
    },
  ];

  const tableStyleOptions = tableStyleOptionsArray[0];

  const colNames = ['Rank', 'Model', 'ELO', 'Avg Time', 'Params'];

  const chartOptionsArray = [
    {
      type: 'bar',
      options: {
        roughness: 1.5,
        fillStyle: 'hachure',
        fillWeight: 3,
        stroke: 'grey',
        strokeWidth: 2,
        title: 'Rank',
      },
    },
    {
      type: 'barh',
      options: {
        roughness: 1.5,
        fillStyle: 'hachure',
        fillWeight: 2,
        stroke: 'grey',
        strokeWidth: 2,
        title: 'ELO',
      },
    },
    {
      type: 'line',
      options: {
        roughness: 1,
        fillStyle: 'hachure',
        fillWeight: 4,
        stroke: 'blue',
        strokeWidth: 1.5,
        title: 'Line Chart',
      },
    },
    {
      type: 'scatter',
      options: {
        roughness: 2.5,
        fillStyle: 'cross-hatch',
        fillWeight: 1.5,
        stroke: 'red',
        strokeWidth: 1,
        title: 'Scatter Chart',
      },
    },
  ];

  const chartOptions = chartOptionsArray.reduce((acc, chart) => {
    acc[chart.type] = chart.options;
    return acc;
  }, {});


  return (
    <>
      {/* The canvas */}
      <div className={`h-full w-full top-0 left-0 absolute ${isPlaying ? '' : 'pointer-events-none'}`}>
        <SketchCanvas
          onSketchChange={() => {
            setSketchHasChanged(true);
          }}
          ref={canvasRef}
        />
      </div>

      {/* The main menu */}
      <AnimatePresence initial={false} mode='wait'>
        {menuVisible && (
          <Menu
            gameState={gameState}
            onClick={handleMainClick}
            onLeaderboardClick={handleLeaderboardClick}
          />
        )}
      </AnimatePresence>

      {/* The countdown screen */}
      <AnimatePresence initial={false} mode='wait'>
        {countdownVisible && <Countdown countdown={countdown} />}
      </AnimatePresence>

      {/* The game over screen */}
      <AnimatePresence initial={false} mode='wait'>
        {gameOver && <GameOver predictions={predictions} onClick={handleGameOverClick} />}
      </AnimatePresence>

      {/* The leaderboard */}
      <AnimatePresence initial={false} mode='wait'>
        {isLeaderboardVisible && (
          <Leaderboard
          initialTableData={initialTableData}
          graphData={graphData}
          colNames={colNames}
          tableStyleOptions={tableStyleOptions}
          chartOptions={chartOptions}
          numGraphs={3}
          onClose={handleLeaderboardClick}
          />
        )}
      </AnimatePresence>
      {/* The game UI */}
      {isPlaying && gameCurrentTime !== null && targets && (
        <div className='absolute top-5 text-center'>
          <h2 className='text-4xl'>Draw &quot;{targets[targetIndex]}&quot;</h2>
          <h3 className='text-2xl'>
            {formatTime(Math.max(constants.GAME_DURATION - (gameCurrentTime - gameStartTime) / 1000, 0))}
          </h3>
        </div>
      )}

      {/* The game controls */}
      {isPlaying && (
        <>
          {/* Displaying the prediciton charts */}
          <div className="absolute left-0 top-0">
            <PredictionChart predictions={graphOutput1} i={1} />
          </div>

          <div className="absolute right-0 top-0">
            <PredictionChart predictions={graphOutput2} i={2}/>
          </div>
          <div className="absolute bottom-5 text-center w-full">
            {/* Displaying the predictions in text*/}
            <div className="flex justify-center gap-20 mb-5">
              <div className="flex flex-col items-center justify-center w-1/4">
                <h1 className="text-2xl font-bold text-center">{output1 && output1[0] && (<>{modelNameMap[selectedModelsRef.current[0]]}<br />Prediction: {output1[0].label} ({(100 * output1[0].score).toFixed(1)}%)</>)}</h1>
              </div>

              <div className="flex flex-col items-center justify-center w-1/4">
                <h1 className="text-2xl font-bold text-center">{output2 && output2[0] && (<>{modelNameMap[selectedModelsRef.current[1]]}<br />Prediction: {output2[0].label} ({(100 * output2[0].score).toFixed(1)}%)</>)}</h1>
              </div>
            </div>
            {/* Buttons to handle clear, skip, and exit*/}
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