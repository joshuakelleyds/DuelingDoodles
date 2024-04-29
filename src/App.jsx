import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import SketchCanvas from './components/SketchCanvas';
import constants from './constants';
import Menu from './components/Menu';
import GameOver from './components/GameOver';
import Countdown from './components/Countdown';
import { AnimatePresence } from 'framer-motion';

// Function to format time as "minutes:seconds"
const formatTime = (seconds) => {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Function to shuffle an array randomly
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function App() {
  // Variables to store different states of the game
  const [ready, setReady] = useState(false); // Indicates if the game is ready to start
  const [gameState, setGameState] = useState('menu'); // Keeps track of the current state of the game (menu, loading, countdown, playing, end)
  const [countdown, setCountdown] = useState(constants.COUNTDOWN_TIMER); // Stores the countdown timer value
  const [gameCurrentTime, setGameCurrentTime] = useState(null); // Stores the current time during the game
  const [gameStartTime, setGameStartTime] = useState(null); // Stores the start time of the game
  const [output, setOutput] = useState(null); // Stores the output from the machine learning model
  const [isPredicting, setIsPredicting] = useState(false); // Indicates if the model is currently making a prediction
  const [sketchHasChanged, setSketchHasChanged] = useState(false); // Indicates if the player's sketch has changed
  const [targets, setTargets] = useState(null); // Stores the list of target words for the player to draw
  const [targetIndex, setTargetIndex] = useState(0); // Keeps track of the current target word index
  const [predictions, setPredictions] = useState([]); // Stores the history of predictions made during the game

  // Reference to the worker that runs the machine learning model
  const worker = useRef(null);

  // Reference to the SketchCanvas component
  const canvasRef = useRef(null);

  // Set up the worker when the component is first loaded
  useEffect(() => {
    if (!worker.current) {
      // Create a new worker if it doesn't exist
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }

    // Function to handle messages received from the worker
    const onMessageReceived = (e) => {
      const result = e.data;

      switch (result.status) {
        case 'ready':
          // When the worker is ready, set the game as ready and start the countdown
          setReady(true);
          beginCountdown();
          break;

        case 'update':
          // Not used in this code, but can be used for real-time updates from the worker
          break;

        case 'result':
          // When the worker sends a prediction result
          setIsPredicting(false);

          // Filter out any banned labels and adjust the scores based on game settings
          const filteredResult = result.data.filter(
            (x) => !constants.BANNED_LABELS.includes(x.label)
          );
          const timespent = canvasRef.current.getTimeSpentDrawing();
          const applyEasyMode = timespent - constants.REJECT_TIME_DELAY;
          if (applyEasyMode > 0 && filteredResult[0].score > constants.START_REJECT_THRESHOLD) {
            let amount = applyEasyMode / constants.REJECT_TIME_PER_LABEL;
            for (let i = 0; i < filteredResult.length && i < amount + 1; ++i) {
              if (filteredResult[i].label === targets[targetIndex]) {
                continue;
              }
              if (amount > i) {
                filteredResult[i].score = 0;
              } else {
                filteredResult[i].score *= i - amount;
              }
            }
            filteredResult.sort((a, b) => b.score - a.score);
          }

          // Normalize the scores to add up to 1
          const sum = filteredResult.reduce((acc, x) => acc + x.score, 0);
          filteredResult.forEach((x) => (x.score /= sum));

          setOutput(filteredResult);
          break;
      }
    };

    // Listen for messages from the worker
    worker.current.addEventListener('message', onMessageReceived);

    // Clean up the event listener when the component is unmounted
    return () => worker.current.removeEventListener('message', onMessageReceived);
  }, []);

  // Function to send the current sketch to the worker for prediction
  const classify = useCallback(() => {
    if (worker.current && canvasRef.current) {
      const image = canvasRef.current.getCanvasData();
      if (image !== null) {
        setIsPredicting(true);
        worker.current.postMessage({ action: 'classify', image });
      }
    }
  }, []);

  // Function to handle the end of the game
  const handleEndGame = (cancelled = false) => {
    endGame(cancelled);
  };

  // Function to clear the canvas
  const handleClearCanvas = (resetTimeSpentDrawing = false) => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas(resetTimeSpentDrawing);
    }
  };

  // Function to start the countdown before the game begins
  const beginCountdown = () => {
    setGameState('countdown');

    // Choose the target words for the game and shuffle them
    const possibleLabels = Object.values(constants.LABELS).filter(
      (x) => !constants.BANNED_LABELS.includes(x)
    );
    shuffleArray(possibleLabels);

    setTargets(possibleLabels);
    setTargetIndex(0);
  };

  // Function to handle the click event on the main menu button
  const handleMainClick = () => {
    if (!ready) {
      setGameState('loading');
      worker.current.postMessage({ action: 'load' });
    } else {
      beginCountdown();
    }
  };

  // Function to handle the click event on the game over screen
  const handleGameOverClick = (playAgain) => {
    if (playAgain) {
      beginCountdown();
    } else {
      endGame(true);
    }
  };

  // Start the game when the countdown reaches 0
  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
      setGameStartTime(performance.now());
      setPredictions([]);
      setGameState('playing');
    }
  }, [gameState, countdown]);

  // Function to add a prediction to the predictions array
  const addPrediction = useCallback(
    (isCorrect) => {
      const image = canvasRef.current.getCanvasData();
      setPredictions((prev) => [
        ...prev,
        {
          output: output?.[0] ?? null,
          image: image,
          correct: isCorrect,
          target: targets[targetIndex],
        },
      ]);
    },
    [output, targetIndex, targets]
  );

  // Function to end the game
  const endGame = useCallback(
    (cancelled = false) => {
      if (!cancelled) {
        addPrediction(false);
      }

      // Reset the game state
      setGameStartTime(null);
      setOutput(null);
      setSketchHasChanged(false);
      handleClearCanvas(true);
      setCountdown(constants.COUNTDOWN_TIMER);
      setGameState(cancelled ? 'menu' : 'end');
    },
    [addPrediction]
  );

  // End the game when the time runs out
  useEffect(() => {
    if (
      gameState === 'playing' &&
      gameCurrentTime !== null &&
      gameStartTime !== null &&
      (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION
    ) {
      endGame();
    }
  }, [endGame, gameState, gameStartTime, gameCurrentTime]);

  // Function to move to the next target word
  const goNext = useCallback(
    (isCorrect = false) => {
      if (!isCorrect) {
        // Apply a time penalty for skipping a word
        setGameStartTime((prev) => prev - constants.SKIP_PENALTY);
      }
      addPrediction(isCorrect);

      setTargetIndex((prev) => prev + 1);
      setOutput(null);
      setSketchHasChanged(false);
      handleClearCanvas(true);
    },
    [addPrediction]
  );

  // Move to the next target word when the current one is guessed correctly
  useEffect(() => {
    if (gameState === 'playing' && output !== null && targets !== null) {
      if (targets[targetIndex] === output[0].label) {
        goNext(true);
      }
    }
  }, [goNext, gameState, output, targets, targetIndex]);

  // Game loop
  useEffect(() => {
    if (gameState === 'countdown') {
      // Start the countdown timer
      const countdownTimer = setInterval(() => {
        setCountdown((prevCount) => prevCount - 1);
      }, 1000);

      return () => {
        clearInterval(countdownTimer);
      };
    } else if (gameState === 'playing') {
      // Periodically classify the sketch and update the game time
      const classifyTimer = setInterval(() => {
        if (sketchHasChanged) {
          !isPredicting && classify();
        }
        setSketchHasChanged(false);

        setGameCurrentTime(performance.now());
      }, constants.PREDICTION_REFRESH_TIME);

      return () => {
        clearInterval(classifyTimer);
      };
    } else if (gameState === 'end') {
      // Clear the canvas when the game ends
      handleClearCanvas(true);
    }
  }, [gameState, isPredicting, sketchHasChanged, addPrediction, classify]);

  // Disable touch scrolling during the game
  useEffect(() => {
    if (gameState === 'playing') {
      const preventDefault = (e) => e.preventDefault();
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventDefault, { passive: false });
      };
    }
  }, [gameState]);

  // Determine which components should be visible based on the game state
  const menuVisible = gameState === 'menu' || gameState === 'loading';
  const isPlaying = gameState === 'playing';
  const countdownVisible = gameState === 'countdown';
  const gameOver = gameState === 'end';

  return (
    <>
      {/* The canvas where the player draws */}
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
            {output && `Prediction: ${output[0].label} (${(100 * output[0].score).toFixed(1)}%)`}
            {output && `Prediction: ${output[1].label} (${(100 * output[1].score).toFixed(1)}%)`}
            {output && `Prediction: ${output[2].label} (${(100 * output[2].score).toFixed(1)}%)`}
          </h1>
 
          <div className='flex gap-2 justify-center'>
            <button onClick={() => { handleClearCanvas() }}>Clear</button>
            <button onClick={() => { goNext(false) }}>Skip</button>
            <button onClick={() => { handleEndGame(true) }}>Exit</button>
          </div>
        </div>
      )}
    </>
  );
}
  export default App;