import React, { useState, useEffect } from 'react';
import { GAME_PHASES } from '../engine/types';
import Card from './components/Card';
import PlayerDashboard from './components/PlayerDashboard';

const GameClient = ({ socket, gameState, myPlayerId }) => {
    // gameState is fully synced from server
    // myPlayerId is the gameId (0, 1, 2...) OR socketId? 
    // Server Room.js stores: players: [{ socketId, name, id }]
    // gameState.players: [{ id, name ... }]
    // We need to know WHICH player 'I' am in the gameState to show "YOU" UI.

    // We'll rely on App.jsx passing the correct 'myPlayerId' (index).

    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [myDecision, setMyDecision] = useState(null); // 'STAY' | 'LEAVE' | null

    // Reset local decision state when phase changes to DECISION or new card revealed
    useEffect(() => {
        // Always reset decision when the game state updates to a point where a new decision is needed.
        // If we are in DECISION phase, and path length changed (new card), it's a new decision.
        // If we are NOT in DECISION phase, we don't need a decision.
        setMyDecision(null);
        setIsDecisionModalOpen(false);
    }, [gameState.phase, gameState.path.length, myPlayerId]);

    const sendDecision = (decision) => {
        setMyDecision(decision); // Optimistic UI
        socket.emit('game_action', { type: 'DECISION', decision });
    };

    const handleNextRound = () => {
        socket.emit('game_action', { type: 'NEXT_ROUND' });
    };

    // Derived State
    const me = gameState.players.find(p => p.id === myPlayerId);
    const activePlayers = gameState.players.filter(p => p.status === 'IN');
    const waitingForCount = activePlayers.length - (gameState.pendingDecisionsCount || 0);
    // Note: server doesn't send 'who' decided to prevent info leak (optional), 
    // but here we might want to know if 'I' locked in.

    // Server Room.js sends: pendingDecisionsCount.
    // We can assume if I clicked, I am one of them.

    return (
        <div className="app-container">
            {/* Header */}
            <header className="game-header">
                <div>
                    <h2>第 {gameState.round} / 5 轮</h2>
                </div>
                <div>
                    <h3>{me ? `当前探险者：${me.name}` : '观战中'}</h3>
                </div>
            </header>

            {/* Game Board */}
            <main className="game-board">
                {gameState.path.map((card, idx) => (
                    <div key={card.id || idx} style={{ position: 'relative' }}>
                        <Card card={card} />
                        {gameState.gemsOnPath[idx] > 0 && (
                            <div className="gem-pile">
                                💎 剩余 {gameState.gemsOnPath[idx]} 颗
                            </div>
                        )}
                    </div>
                ))}
                {gameState.path.length === 0 && <div style={{ opacity: 0.5 }}>道路空空如也...</div>}

                {/* Floating Action Button for Decision (Only if IN and DECISION phase) */}
                {gameState.phase === GAME_PHASES.DECISION && me && me.status === 'IN' && !isDecisionModalOpen && (
                    <div style={{ position: 'fixed', bottom: '260px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
                        <button className="btn-gold" onClick={() => setIsDecisionModalOpen(true)}>
                            {myDecision ? '抉择已锁定 ✓' : '做出决定 ⛺/🔦'}
                        </button>
                    </div>
                )}
            </main>

            {/* Log */}
            <div className="log-container">
                {gameState.log.slice(-10).map((l, i) => <div key={i}>{l}</div>)}
            </div>

            {/* Player Dashboard */}
            <section>
                <PlayerDashboard players={gameState.players} currentDecisionMaker={null} />
            </section>

            {/* Decision Overlay */}
            {gameState.phase === GAME_PHASES.DECISION && me && me.status === 'IN' && isDecisionModalOpen && (
                <div className="overlay" style={{ background: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal">
                        <h2>抉择阶段</h2>
                        <p>你是要继续探险，还是返回营地？</p>

                        {myDecision ? (
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ color: '#10b981' }}>你的选择：{myDecision === 'STAY' ? '继续探险 🔦' : '撤离 ⛺'}</h3>
                                <p>等待其他探险者...</p>
                                <button className="btn-secondary" onClick={() => setIsDecisionModalOpen(false)}>隐藏</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                                <button className="btn-primary" onClick={() => sendDecision('STAY')}>继续探险 🔦</button>
                                <button className="btn-secondary" onClick={() => sendDecision('LEAVE')}>撤离 ⛺</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Round Start / Ready Check Overlay */}
            {gameState.phase === GAME_PHASES.ROUND_START && (
                <div className="overlay" style={{ background: 'rgba(0,0,0,0.95)' }}>
                    <div className="modal" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>第 {gameState.round - 1} 轮总结</h2>

                        {/* Round Summary Table */}
                        <div style={{ marginBottom: '20px', background: '#334155', borderRadius: '8px', padding: '10px' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #475569' }}>
                                        <th style={{ padding: '8px' }}>探险者</th>
                                        <th style={{ padding: '8px' }}>宝石总计 💎</th>
                                        <th style={{ padding: '8px' }}>神器 🗿</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(gameState.lastRoundResults || []).map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #475569' }}>
                                            <td style={{ padding: '8px' }}>{p.name} {p.status === 'OUT' ? '⛺' : '💀'}</td>
                                            <td style={{ padding: '8px' }}>{p.totalGems}</td>
                                            <td style={{ padding: '8px' }}>{p.artifactsCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3>准备迎接第 {gameState.round} 轮</h3>
                        <p style={{ marginBottom: '10px' }}>等待所有探险者准备就绪...</p>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px' }}>
                            {gameState.players.map(p => {
                                const isReady = (gameState.readyPlayerIds || []).includes(p.id);
                                return (
                                    <div key={p.id} className="player-ready-tag" style={{
                                        padding: '8px 15px',
                                        borderRadius: '20px',
                                        background: isReady ? '#065f46' : '#475569',
                                        border: isReady ? '2px solid #10b981' : '2px solid transparent',
                                        display: 'flex', alignItems: 'center', gap: '5px'
                                    }}>
                                        <span>{p.name}</span>
                                        <span>{isReady ? '✓' : '...'}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {!(gameState.readyPlayerIds || []).includes(myPlayerId) ? (
                            <button className="btn-gold" style={{ width: '100%', padding: '15px' }} onClick={() => socket.emit('game_action', { type: 'PLAYER_READY' })}>
                                我准备好了！
                            </button>
                        ) : (
                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>你已准备就绪。等待其他探险者...</div>
                        )}
                    </div>
                </div>
            )}

            {/* Game End Overlay */}
            {gameState.winner && (
                <div className="overlay" style={{ background: 'rgba(0,0,0,0.95)' }}>
                    <div className="modal" style={{ width: '600px' }}>
                        <h1>探险结束！</h1>
                        <h2 style={{ color: '#fbbf24' }}>🏆 获胜者：{gameState.winner.name} 🏆</h2>
                        <h3 style={{ marginBottom: '20px' }}>最终得分：{gameState.winner.score}</h3>

                        {/* Final Scoreboard */}
                        <div style={{ marginBottom: '30px', background: '#334155', borderRadius: '8px', padding: '10px' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #475569' }}>
                                        <th style={{ padding: '8px' }}>排名</th>
                                        <th style={{ padding: '8px' }}>探险者</th>
                                        <th style={{ padding: '8px' }}>得分</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...gameState.players].sort((a, b) => b.score - a.score).map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #475569', background: i === 0 ? 'rgba(251, 191, 36, 0.1)' : 'transparent' }}>
                                            <td style={{ padding: '8px' }}>#{i + 1}</td>
                                            <td style={{ padding: '8px' }}>{p.name}</td>
                                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.score}</td>
                                        </tr>
                                    ))}
                                    {/* Final scoreboard content remains same, just Rank table update above */}
                                </tbody>
                            </table>
                        </div>

                        <button className="btn-primary" onClick={() => window.location.reload()}>返回大厅</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameClient;
