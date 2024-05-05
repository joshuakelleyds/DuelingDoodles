// Import necessary dependencies
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import SketchCanvas from './components/SketchCanvas';
import constants from './constants';
import Menu from './components/Menu';
import GameOver from './components/GameOver';
import Countdown from './components/Countdown';
import { AnimatePresence } from 'framer-motion';
import PredictionChart from './components/PredictionChart';

import {
  formatTime,
  shuffleArray,
  filterAndAdjustScores,
  createWorkers,
  startCountdown,
  startGame,
  endGame,
  goToNextWord,
  checkGameOver,
  checkWordGuessed,
  gameLoop,
} from './GameLogic';

function App() {
  // State variables
  const [ready, setReady] = useState(false);
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

  // Refs
  const worker1 = useRef(null);
  const worker2 = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Create worker instances
    const { worker1: createdWorker1, worker2: createdWorker2 } = createWorkers();
    worker1.current = createdWorker1;
    worker2.current = createdWorker2;

    // Message handler for worker 1
    const onMessageReceived1 = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
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
          setReady(true);
          beginCountdown();
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
    checkWordGuessed(
      gameState,
      output1,
      output2,
      targets,
      targetIndex,
      goToNextWord,
      addPrediction,
      setTargetIndex,
      setOutput1,
      setOutput2,
      setSketchHasChanged,
      handleClearCanvas,
      setGameStartTime
    );
  }, [gameState, output1, output2, targets, targetIndex, goToNextWord, addPrediction, setTargetIndex, setOutput1, setOutput2, setSketchHasChanged, handleClearCanvas, setGameStartTime]);

  useEffect(() => {
    const cleanup = gameLoop(
      gameState,
      isPredicting1,
      isPredicting2,
      sketchHasChanged,
      classify,
      setSketchHasChanged,
      setGameCurrentTime
    );
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
        {menuVisible && <Menu gameState={gameState} onClick={handleMainClick} />}
      </AnimatePresence>

      {/* The countdown screen */}
      <AnimatePresence initial={false} mode='wait'>
        {countdownVisible && <Countdown countdown={countdown} />}
      </AnimatePresence>

      {/* The game over screen */}
      <AnimatePresence initial={false} mode='wait'>
        {gameOver && <GameOver predictions={predictions} onClick={handleGameOverClick} />}
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

      {/* Show a message on the main menu */}
      {menuVisible && (
        <div className='absolute bottom-4'>
          Made with{" "}
          <a
            className='underline'
            href='https://github.com/xenova/transformers.js'
          >
            🤗 Transformers.js
          </a>
        </div>
      )}

      {/* The game controls */}
      {isPlaying && (
        <>
          <div className='absolute left-0 top-0'>
            <PredictionChart output1={graphOutput1} />
          </div>
          <div className='absolute right-0 top-0'>
            <PredictionChart output1={graphOutput2} />
          </div>
          <div className='absolute bottom-5 text-center w-full'>
            <div className='flex justify-around mb-5'>
              <div className='w-1/3 text-left'>
                <h1 className="text-2xl font-bold">
                  {output1 && output1[0] && (
                    <>
                      MobileVIT-XXS
                      <br />
                      Prediction: {output1[0].label} ({(100 * output1[0].score).toFixed(1)}%)
                    </>
                  )}
                </h1>
              </div>
              <div className='w-1/3 text-right'>
                <h1 className="text-2xl font-bold">
                  {output2 && output2[0] && (
                    <>
                      MobileVIT-Small
                      <br />
                      Prediction: {output2[0].label} ({(100 * output2[0].score).toFixed(1)}%)
                    </>
                  )}
                </h1>
              </div>
            </div>
            <div className='flex gap-2 justify-center'>
              <button
                className='px-4 py-2 bg-gray-300 rounded'
                onClick={handleClearCanvas}
              >
                Clear
              </button>
              <button
                className='px-4 py-2 bg-blue-300 rounded'
                onClick={() => {
                  goToNextWord(
                    addPrediction,
                    setTargetIndex,
                    setOutput1,
                    setOutput2,
                    setSketchHasChanged,
                    handleClearCanvas,
                    false,
                    setGameStartTime
                  );
                }}
              >
                Skip
              </button>
              <button
                className='px-4 py-2 bg-red-300 rounded'
                onClick={() => { handleEndGame(true); }}
              >
                Exit
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App;