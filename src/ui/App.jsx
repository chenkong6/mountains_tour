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
  const [activeSession, setActiveSession] = useState(null); // { roomId, playerName }
  const [leaderboard, setLeaderboard] = useState([]);
  const [myInfo, setMyInfo] = useState(() => {
    // Try to load from localStorage for reconnection
    const saved = localStorage.getItem('mountain_tour_user');
    if (saved) {
      return JSON.parse(saved);
    }
    return { name: '', roomId: '', isHost: false, id: null, userId: `U-${Math.random().toString(36).substring(2, 9)}` };
  });

  useEffect(() => {
    // Save myInfo to localStorage whenever it changes
    localStorage.setItem('mountain_tour_user', JSON.stringify(myInfo));
  }, [myInfo]);

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);


      // Check for active session instead of auto-joining
      if (myInfo.roomId && myInfo.userId) {
        socket.emit('check_session', {
          roomId: myInfo.roomId,
          userId: myInfo.userId
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('Socket disconnected');
    }

    function onLobbyState(state) {
      console.log('Lobby state received:', state);
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
      // If error, maybe clear room to allow joining another
      if (msg.includes('不存在') || msg.includes('开始')) {
        setMyInfo(prev => ({ ...prev, roomId: '' }));
      }
    }


    function onLeaderboardUpdate(data) {
      console.log('Leaderboard update received:', data);
      setLeaderboard(data);
    }

    function onSessionStatus(status) {
      console.log('Session status received:', status);
      if (status.active) {
        setActiveSession({
          roomId: status.roomId,
          playerName: status.playerName,
          inProgress: status.inProgress
        });
      } else {
        setActiveSession(null);
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobby_state', onLobbyState);
    socket.on('game_state', onGameState);
    socket.on('error_message', onErrorMessage);
    socket.on('leaderboard_update', onLeaderboardUpdate);
    socket.on('session_status', onSessionStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobby_state', onLobbyState);
      socket.off('game_state', onGameState);
      socket.off('error_message', onErrorMessage);
      socket.off('leaderboard_update', onLeaderboardUpdate);
      socket.off('session_status', onSessionStatus);
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
    setMyInfo(prev => ({ ...prev, roomId, name, isHost, id: null }));
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const clearSession = () => {
    setMyInfo(prev => {
      const newState = { ...prev, roomId: '', id: null, isHost: false };
      localStorage.setItem('mountain_tour_user', JSON.stringify(newState));
      return newState;
    });
    setLobbyState(null);
    setGameState(null);
    setInLobby(true);
  };

  if (inLobby || !gameState) {
    if (!lobbyState || !myInfo.roomId) {
      return (
        <Lobby
          socket={socket}
          onJoin={handleJoin}
          gameMode={lobbyState?.gameMode}
          leaderboard={leaderboard}
          myInfo={myInfo}
          activeSession={activeSession}
        />
      );
    } else {
      // Inside Lobby Waiting Room
      return (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>备战室</h1>

            <button
              onClick={() => {
                localStorage.removeItem('mountain_tour_user');
                window.location.reload();
              }}
              style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.6rem', padding: '5px' }}
              className="btn-secondary"
            >
              换个身份
            </button>

            <button
              onClick={clearSession}
              style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.6rem', padding: '5px' }}
              className="btn-secondary"
            >
              ← 返回大厅
            </button>

            <div className="status-tag ready" style={{ fontSize: '1.2rem', padding: '10px 20px', marginBottom: '10px' }}>
              房间 ID: {myInfo.roomId}
            </div>

            <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>当前模式：<span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{lobbyState.gameMode === 'PERSISTENT' ? '硬核 (持久)' : '常规 (刷新)'}</span></div>
              {lobbyState.hostSocketId === socket.id && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn-secondary ${lobbyState.gameMode === 'REFRESH' ? 'active-mode' : ''}`}
                    style={{ flex: 1, fontSize: '0.7rem', padding: '4px', border: lobbyState.gameMode === 'REFRESH' ? '1px solid #fbbf24' : '1px solid transparent' }}
                    onClick={() => socket.emit('game_action', { type: 'SET_GAME_MODE', mode: 'REFRESH' })}
                  >
                    常规
                  </button>
                  <button
                    className={`btn-secondary ${lobbyState.gameMode === 'PERSISTENT' ? 'active-mode' : ''}`}
                    style={{ flex: 1, fontSize: '0.7rem', padding: '4px', border: lobbyState.gameMode === 'PERSISTENT' ? '1px solid #fbbf24' : '1px solid transparent' }}
                    onClick={() => socket.emit('game_action', { type: 'SET_GAME_MODE', mode: 'PERSISTENT' })}
                  >
                    硬核
                  </button>
                </div>
              )}
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

            {lobbyState.hostSocketId === socket.id ? (
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
      onReturnToLobby={clearSession}
    />
  );
}

export default App;
