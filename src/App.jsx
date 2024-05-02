import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import SketchCanvas from './components/SketchCanvas';
import constants from './constants';
import Menu from './components/Menu';
import GameOver from './components/GameOver';
import Countdown from './components/Countdown';
import { AnimatePresence } from 'framer-motion';
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
  const worker1 = useRef(null);
  const worker2 = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const { worker1: createdWorker1, worker2: createdWorker2 } = createWorkers();
    worker1.current = createdWorker1;
    worker2.current = createdWorker2;
  
    const onMessageReceived1 = (e) => {
      const result = e.data;
  
      switch (result.status) {
        case 'ready':
          console.log('Worker 1 Ready');
          break;
  
        case 'update':
          // Not used in this code, but can be used for real-time updates from worker1
          break;
  
        case 'result':
          setIsPredicting1(false);
          const filteredResult1 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput1(filteredResult1);
          break;
      }
    };
  
    const onMessageReceived2 = (e) => {
      const result = e.data;
  
      switch (result.status) {
        case 'ready':
          setReady(true);
          startCountdown(setCountdown, setGameState);
          console.log('Worker 2 Ready');
          break;
  
        case 'update':
          // Not used in this code, but can be used for real-time updates from worker2
          break;
  
        case 'result':
          setIsPredicting2(false);
          const filteredResult2 = filterAndAdjustScores(result.data, canvasRef.current.getTimeSpentDrawing());
          setOutput2(filteredResult2);
          break;
      }
    };
  
    worker1.current.addEventListener('message', onMessageReceived1);
    worker2.current.addEventListener('message', onMessageReceived2);
  
    return () => {
      worker1.current.removeEventListener('message', onMessageReceived1);
      worker2.current.removeEventListener('message', onMessageReceived2);
    };
  }, []);

  const classify = useCallback(() => {
    if (canvasRef.current) {
      const image = canvasRef.current.getCanvasData();
      if (image !== null) {
        if (worker1.current) {
          setIsPredicting1(true);
          worker1.current.postMessage({ action: 'classify', image });
        }
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
    const possibleLabels = Object.values(constants.LABELS).filter(
      (x) => !constants.BANNED_LABELS.includes(x)
    );
    shuffleArray(possibleLabels);
    setTargets(possibleLabels);
    setTargetIndex(0);
  };


  const handleMainClick = () => {
    if (!ready) {
      setGameState('loading');
      worker1.current.postMessage({ action: 'load' });
      worker2.current.postMessage({ action: 'load' });
    } else {
      beginCountdown();
    }
  };

  const handleGameOverClick = (playAgain) => {
    if (playAgain) {
      beginCountdown();
    } else {
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
    checkWordGuessed(gameState, output1, output2, targets, targetIndex, goToNextWord);
  }, [gameState, output1, output2, targets, targetIndex, goToNextWord]);


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
        <div className='absolute bottom-5 text-center'>
          <h1 className="text-2xl font-bold mb-3">
            {`isPlaying: ${targets}`}
            {output1 && output1[0] && `Prediction 1: ${output1[0].label} (${(100 * output1[0].score).toFixed(1)}%)`}
            {output1 && output1[1] && `Prediction 1: ${output1[1].label} (${(100 * output1[1].score).toFixed(1)}%)`}
            {output1 && output1[2] && `Prediction 1: ${output1[2].label} (${(100 * output1[2].score).toFixed(1)}%)`}
            <br />
            {output2 && output2[0] && `Prediction 2: ${output2[0].label} (${(100 * output2[0].score).toFixed(1)}%)`}
            {output2 && output2[1] && `Prediction 2: ${output2[1].label} (${(100 * output2[1].score).toFixed(1)}%)`}
            {output2 && output2[2] && `Prediction 2: ${output2[2].label} (${(100 * output2[2].score).toFixed(1)}%)`}
          </h1>
          <div className='flex gap-2 justify-center'>
            <button onClick={() => { handleClearCanvas() }}>Clear</button>
            <button onClick={() => { goToNextWord(false) }}>Skip</button>
            <button onClick={() => { handleEndGame(true) }}>Exit</button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;