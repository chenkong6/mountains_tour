import React, { useState } from 'react';

const Lobby = ({ socket, onJoin, gameMode, leaderboard }) => {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    const [selectedMode, setSelectedMode] = useState('REFRESH');

    const handleCreate = () => {
        if (!name) { setError('请输入您的名字'); return; }
        const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.emit('join_room', { roomId: newRoomId, playerName: name, mode: selectedMode });
        onJoin(newRoomId, name, true); // true = isHost
    };

    const handleSetMode = (mode) => {
        setSelectedMode(mode);
        // This is the initial lobby, we don't need to emit SET_GAME_MODE yet.
        // The mode will be passed in handleCreate.
    };

    const handleJoin = () => {
        if (!name) { setError('请输入您的名字'); return; }
        if (!roomId) { setError('请输入房间 ID'); return; }
        socket.emit('join_room', { roomId, playerName: name });
        onJoin(roomId, name, false);
    };

    return (
        <div className="overlay">
            <div className="modal">
                <h1>探险之路</h1>

                <div className="rules-section">
                    <h3>探索禁忌之山</h3>
                    <p>
                        欢迎，勇敢的探险者！你的任务是深入山脉，收集稀有的 <b>宝石</b> 💎 和神秘的 <b>神器</b> 🗿。
                        但要小心！山脉中充满了危险。
                    </p>
                    <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                        <li><b>宝藏：</b> 宝石将由所有在场的探险者平分。</li>
                        <li><b>抉择：</b> 每一回合，选择 <b>继续</b> 寻找更多战利品，或 <b>撤离</b> 将宝石存入帐篷。</li>
                        <li><b>灾难：</b> 如果同一轮中出现两次相同的灾难，所有留在山里的人将失去本轮收集的所有宝石！</li>
                    </ul>
                    <p>5 轮探险结束后，财富最多的探险者获胜。</p>
                </div>

                {error && <p style={{ color: '#ef4444', marginBottom: '15px', fontWeight: 'bold' }}>{error}</p>}

                <div style={{ marginBottom: '30px' }}>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="输入您的名字开始探险..."
                        style={{ padding: '15px', width: '100%', textAlign: 'center', fontSize: '1.2rem' }}
                    />
                </div>

                <div className="lobby-grid">
                    <div className="lobby-card">
                        <h2 style={{ color: '#fff' }}>发起探险</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '15px' }}>创建一个私人房间，邀请你的队友。</p>

                        <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>选择游戏模式：</div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className={`btn-secondary ${(gameMode || selectedMode) === 'REFRESH' ? 'active-mode' : ''}`}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '5px', border: (gameMode || selectedMode) === 'REFRESH' ? '2px solid #fbbf24' : '2px solid transparent' }}
                                    onClick={() => handleSetMode('REFRESH')}
                                >
                                    常规 (刷新)
                                </button>
                                <button
                                    className={`btn-secondary ${(gameMode || selectedMode) === 'PERSISTENT' ? 'active-mode' : ''}`}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '5px', border: (gameMode || selectedMode) === 'PERSISTENT' ? '2px solid #fbbf24' : '2px solid transparent' }}
                                    onClick={() => handleSetMode('PERSISTENT')}
                                >
                                    硬核 (持久)
                                </button>
                            </div>
                        </div>

                        <button className="btn-gold" style={{ width: '100%' }} onClick={handleCreate}>开启新探险</button>
                    </div>

                    <div className="lobby-card">
                        <h2 style={{ color: '#fff' }}>加入队伍</h2>
                        <input
                            value={roomId}
                            onChange={e => setRoomId(e.target.value)}
                            placeholder="输入房间 ID"
                            style={{ padding: '10px', marginBottom: '15px', width: '100%', textAlign: 'center' }}
                        />
                        <button className="btn-secondary" style={{ width: '100%' }} onClick={handleJoin}>加入探险队</button>
                    </div>
                </div>
            </div>
            {/* Leaderboard Section */}
            <div className="leaderboard" style={{
                marginTop: '40px',
                background: 'rgba(51, 65, 85, 0.4)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(251, 191, 36, 0.1)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '1.8rem' }}>🏆</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24', margin: 0 }}>探险荣誉榜 (TOP 10)</h2>
                </div>

                {!leaderboard || leaderboard.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic' }}>
                        虚位以待，期待首位传奇探险者的诞生...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '12px 10px' }}>排行</th>
                                    <th style={{ padding: '12px 10px' }}>探险家</th>
                                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>财富总值 (💎+🗿)</th>
                                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>登榜时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, index) => (
                                    <tr key={index} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: index === 0 ? 'rgba(251, 191, 36, 0.05)' : 'transparent'
                                    }}>
                                        <td style={{ padding: '15px 10px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '24px',
                                                height: '24px',
                                                lineHeight: '24px',
                                                textAlign: 'center',
                                                borderRadius: '50%',
                                                background: index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                                color: index <= 2 ? '#1e293b' : '#94a3b8',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem'
                                            }}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px 10px', fontWeight: 'bold', color: index === 0 ? '#fbbf24' : '#f8fafc' }}>
                                            {entry.name}
                                        </td>
                                        <td style={{ padding: '15px 10px', textAlign: 'right', color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {entry.score}
                                        </td>
                                        <td style={{ padding: '15px 10px', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                                            {entry.timestamp}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Lobby;
