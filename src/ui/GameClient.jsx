import React, { useState, useEffect } from 'react';
import { GAME_PHASES } from '../engine/types';
import Card from './components/Card';
import PlayerDashboard from './components/PlayerDashboard';

const GameClient = ({ socket, gameState, myPlayerId, onReturnToLobby }) => {
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

                {/* Card Counter - NEW */}
                <div className="deck-stats" style={{ display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.3)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div title="宝藏卡剩余数量" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>💎</span>
                        <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>
                            {gameState.deck.filter(c => c.type === 'TREASURE').length}
                        </span>
                    </div>
                    <div title="神器卡剩余数量" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🗿</span>
                        <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>
                            {gameState.deck.filter(c => c.type === 'ARTIFACT').length}
                        </span>
                    </div>
                    <div title="灾难卡剩余数量" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>⚠️</span>
                        <span style={{ fontWeight: 'bold', color: '#ef4444' }}>
                            {gameState.deck.filter(c => c.type === 'HAZARD').length}
                        </span>
                    </div>
                    <div style={{ marginLeft: '10px', paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>总计: </span>
                        <span style={{ fontWeight: 'bold' }}>{gameState.deck.length}</span>
                    </div>
                </div>

                <div>
                    <h3>{me ? `当前探险者：${me.name}` : '观战中'}</h3>
                </div>
            </header>

            {/* Player Dashboard (Now Row 2) */}
            <PlayerDashboard
                players={gameState.players}
                currentDecisionMaker={null}
                decidedPlayerIds={gameState.decidedPlayerIds || []}
            />

            {/* Game Board (Now Row 3) */}
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
                    <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001 }}>
                        <button className="btn-gold" onClick={() => setIsDecisionModalOpen(true)} style={{ boxShadow: '0 0 30px rgba(245, 158, 11, 0.4)', padding: '15px 40px', fontSize: '1.2rem' }}>
                            {myDecision ? '抉择已锁定 ✓' : '做出决定 ⛺/🔦'}
                        </button>
                    </div>
                )}
            </main>

            {/* Log (Floating or positioned) */}
            <div className="log-container" style={{ position: 'fixed', bottom: '120px', right: '20px', maxWidth: '350px', background: 'rgba(15, 23, 42, 0.9)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', maxHeight: '200px', overflowY: 'auto', zIndex: 900, fontSize: '0.85rem' }}>
                {gameState.log.slice(-10).map((l, i) => <div key={i} style={{ marginBottom: '8px', padding: '5px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{l}</div>)}
            </div>


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
                    <div className="modal" style={{ width: '750px', maxHeight: '95vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '2.5rem', marginBottom: '5px' }}>第 {gameState.round - 1} 轮总结</h2>
                            {gameState.currentRoundEndReason?.type === 'DISASTER' ? (
                                <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                    ⚠️ 遭遇灾难：{gameState.currentRoundEndReason.hazard.label}！
                                </div>
                            ) : (
                                <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                    ✅ 探险圆满结束
                                </div>
                            )}
                        </div>

                        {/* Round Summary Table */}
                        <div style={{ marginBottom: '30px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.9rem' }}>
                                        <th style={{ padding: '12px' }}>探险者</th>
                                        <th style={{ padding: '12px' }}>本轮宝石 💎</th>
                                        <th style={{ padding: '12px' }}>本轮神器 🗿</th>
                                        <th style={{ padding: '12px' }}>状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(gameState.lastRoundResults || []).map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '60px' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.name}</td>
                                            <td style={{ padding: '12px', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold' }}>+{p.gemsGained}</td>
                                            <td style={{ padding: '12px', color: '#f59e0b', fontSize: '1.1rem' }}>{p.artifactsGained > 0 ? `🗿 x${p.artifactsGained}` : '-'}</td>
                                            <td style={{ padding: '12px' }}>
                                                {p.status === 'SAFE' ? (
                                                    <span style={{ color: '#10b981', padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', fontSize: '0.85rem' }}>🏡 安全撤离</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', fontSize: '0.85rem' }}>💀 遇险丧命</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Hardcore Mode Special Notification */}
                        {gameState.gameMode === 'PERSISTENT' && gameState.currentRoundEndReason?.type === 'DISASTER' && (
                            <div style={{
                                marginBottom: '30px',
                                padding: '15px',
                                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(0,0,0,0))',
                                borderRadius: '10px',
                                borderLeft: '4px solid #ef4444'
                            }}>
                                <h4 style={{ margin: '0 0 5px 0', color: '#ef4444' }}>💥 强力余震</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                                    由于发生了灾难，一张 <b>{gameState.currentRoundEndReason.hazard.label}</b> 卡牌已被永久从探险队中移除。
                                    山脉现在变得稍微安全了一些。
                                </p>
                            </div>
                        )}

                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ marginBottom: '15px' }}>准备迎接第 {gameState.round} 轮</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '25px' }}>
                                {gameState.players.map(p => {
                                    const isReady = (gameState.readyPlayerIds || []).includes(p.id);
                                    return (
                                        <div key={p.id} className="player-ready-tag" style={{
                                            padding: '8px 15px',
                                            borderRadius: '20px',
                                            background: isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                                            border: isReady ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.1)',
                                            color: isReady ? '#10b981' : '#94a3b8',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            transition: 'all 0.3s'
                                        }}>
                                            <span>{p.name}</span>
                                            {isReady && <span>✓</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {!(gameState.readyPlayerIds || []).includes(myPlayerId) ? (
                                <button className="btn-gold" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }} onClick={() => socket.emit('game_action', { type: 'PLAYER_READY' })}>
                                    我已经准备好再次出发了！ 🔦
                                </button>
                            ) : (
                                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem', padding: '15px', border: '2px dashed #10b981', borderRadius: '12px' }}>
                                    ⏳ 你已就绪。正在等待其他探险者集结...
                                </div>
                            )}
                        </div>
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

                        <button className="btn-primary" onClick={onReturnToLobby}>返回大厅</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameClient;
