import React, { useState } from 'react';

const Lobby = ({ socket, onJoin }) => {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');

    const handleCreate = () => {
        if (!name) { setError('请输入您的名字'); return; }
        const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.emit('join_room', { roomId: newRoomId, playerName: name });
        onJoin(newRoomId, name, true); // true = isHost
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
        </div>
    );
};

export default Lobby;
