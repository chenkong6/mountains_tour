import React from 'react';
// css imported globally

const PlayerDashboard = ({ players, currentDecisionMaker, decidedPlayerIds = [] }) => {
    return (
        <div className="dashboard-billboard">
            <div className="billboard-header">
                <h3>探险队成员状态</h3>
            </div>
            <div className="dashboard-grid">
                {players.map((p) => {
                    const hasDecided = decidedPlayerIds.includes(p.id);
                    return (
                        <div
                            key={p.id}
                            className={`player-billboard-card ${p.status === 'OUT' ? 'status-out' : 'status-in'} ${currentDecisionMaker === p.id ? 'status-deciding' : ''}`}
                        >
                            {/* Connection Status Bulb */}
                            <div className="player-conn-status">
                                <span
                                    className={`conn-bulb ${p.isConnected ? 'online' : 'offline'}`}
                                    title={p.isConnected ? '在线' : '离线'}
                                ></span>
                            </div>

                            {/* Decision Status Icon - NEW */}
                            <div className="player-decision-status">
                                {p.status === 'IN' && (
                                    hasDecided ?
                                        <span className="decision-check done" title="已做出决定">✅</span> :
                                        <span className="decision-check thinking" title="正在思考...">🤔</span>
                                )}
                            </div>

                            <div className="player-header">
                                <span className="player-name">{p.name}</span>
                                <span className="player-status-icon">{p.status === 'IN' ? '🔦' : '⛺'}</span>
                            </div>

                            <div className="player-stats-billboard">
                                <div className="stat-chunk" title="已存入帐篷">
                                    <span className="icon">⛺</span>
                                    <span className="value">{p.gemsInTent}</span>
                                </div>
                                <div className="stat-chunk risk" title="探险中（有风险）">
                                    <span className="icon">💎</span>
                                    <span className="value">{p.gemsInHand}</span>
                                </div>
                            </div>

                            <div className="player-artifacts-list">
                                {p.artifacts.map((a, i) => (
                                    <span key={i} className="artifact-badge" title={`神器：价值 ${a.value}`}>🗿</span>
                                ))}
                                {p.artifacts.length === 0 && <span className="no-artifacts">无神器</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlayerDashboard;
