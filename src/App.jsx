import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState({});
  const [round, setRound] = useState(1);
  const [choice, setChoice] = useState(25);
  const [phase, setPhase] = useState('join'); // 'join' | 'lobby' | 'round'
  const [name, setName] = useState('');
  const [connected, setConnected] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    const host =
      window.location.hostname === 'localhost'
        ? 'localhost'
        : window.location.hostname;

    const newSocket = io(`http://${host}:3001`, {
      reconnection: true,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('players', (data) => {
      // Always replace with fresh server state
      setPlayers(data || {});
    });

    newSocket.on('roundStart', (r) => {
      console.log('Round start:', r);
      setRound(r);
      setPhase('round');
      setChoice(25);
      setSubmitted(false);
      if (inputRef.current) inputRef.current.focus();
    });

    newSocket.on('result', (result) => {
      console.log('Round result:', result);
      // Show lobby for next round
      setRound(result.round + 1);
      setPhase('lobby');
      setSubmitted(false);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const join = useCallback(() => {
    if (!name.trim() || !socket || !connected) return;
    socket.emit('join', name.trim());
    setPhase('lobby');
  }, [name, socket, connected]);

  const startRound = () => {
    if (!socket) return;
    socket.emit('startRound');
  };

  const submit = () => {
    if (!socket || submitted) return;
    socket.emit('choice', parseInt(choice, 10));
    setSubmitted(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') join();
  };

  if (phase === 'join') {
    return (
      <div className="join">
        <h1>♢ KING OF DIAMONDS ♢</h1>
        <div className="status">
          {connected ? '🟢 Connected' : '🔴 Connecting...'}
        </div>
        <input
          placeholder="Player Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
        />
        <button
          onClick={join}
          disabled={!name.trim() || !connected}
        >
          Enter Borderland
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>♢ KING OF DIAMONDS ♢</h1>

      <div className="status">
        Round {round} | {Object.keys(players).length} players
      </div>

      <div className="players">
        {Object.keys(players).length === 0 ? (
          <div>No players joined yet</div>
        ) : (
          Object.entries(players).map(([id, p]) => (
            <div
              key={id}
              className={
                p.health !== undefined && p.health <= 0 ? 'eliminated' : ''
              }
            >
              {p.name}: {p.health ?? 10} HP
            </div>
          ))
        )}
      </div>

      {phase === 'lobby' && (
        <button className="big-btn" onClick={startRound}>
          Start Round {round}
        </button>
      )}

      {phase === 'round' && (
        <div className="choice">
          <h2>Choose 0-100</h2>
          <input
            ref={inputRef}
            type="range"
            min="0"
            max="100"
            step="1"
            value={choice}
            onChange={(e) => {
              if (!submitted) setChoice(e.target.value);
            }}
            disabled={submitted}
          />
          <div className="choice-value">{choice}</div>
          <button
            onClick={submit}
            disabled={submitted}
          >
            {submitted ? 'Choice Submitted' : 'Submit Choice'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
