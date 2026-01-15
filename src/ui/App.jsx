import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import GameClient from './GameClient';
import './index.css';

// Initialize socket outside component
const socket = io(import.meta.env.VITE_SERVER_URL || '/', { autoConnect: false });

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [inLobby, setInLobby] = useState(true);
  const [lobbyState, setLobbyState] = useState(null); // { players, inProgress ... }
  const [gameState, setGameState] = useState(null);
  const [myInfo, setMyInfo] = useState({ name: '', roomId: '', isHost: false, id: null }); // id is gameId

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onLobbyState(state) {
      setLobbyState(state);
      // If game started, switch to game view
      if (state.inProgress) {
        setInLobby(false);
      }
    }

    function onGameState(state) {
      setGameState(state);
      setInLobby(false);
    }

    function onErrorMessage(msg) {
      alert(msg);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby_state', onLobbyState);
    socket.on('game_state', onGameState);
    socket.on('error_message', onErrorMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby_state', onLobbyState);
      socket.off('game_state', onGameState);
      socket.off('error_message', onErrorMessage);
      socket.disconnect();
    };
  }, []);

  // Determine my IDs
  useEffect(() => {
    if (gameState && myInfo.name) {
      const p = gameState.players.find(p => p.name === myInfo.name);
      if (p) {
        setMyInfo(prev => ({ ...prev, id: p.id }));
      }
    }
  }, [gameState, myInfo.name]);


  const handleJoin = (roomId, name, isHost) => {
    setMyInfo({ roomId, name, isHost, id: null });
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  if (inLobby || !gameState) {
    if (!lobbyState || !myInfo.roomId) {
      return <Lobby socket={socket} onJoin={handleJoin} />;
    } else {
      // Inside Lobby Waiting Room
      return (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>备战室</h1>
            <div className="status-tag ready" style={{ fontSize: '1.2rem', padding: '10px 20px', marginBottom: '20px' }}>
              房间 ID: {myInfo.roomId}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#94a3b8' }}>已加入的探险者：</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {lobbyState.players.map(p => (
                  <li key={p.socketId} style={{
                    fontSize: '1.1rem',
                    padding: '10px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span>{p.name}</span>
                    {p.name === myInfo.name && <span className="status-tag ready" style={{ fontSize: '0.7rem' }}>您</span>}
                  </li>
                ))}
              </ul>
            </div>

            {myInfo.isHost ? (
              <button className="btn-gold" style={{ width: '100%' }} onClick={handleStartGame}>开启探险</button>
            ) : (
              <div className="status-tag waiting" style={{ width: '100%', padding: '15px' }}>
                等待队长开启探险...
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <GameClient
      socket={socket}
      gameState={gameState}
      myPlayerId={myInfo.id}
    />
  );
}

export default App;
