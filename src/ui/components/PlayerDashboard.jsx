import React from 'react';
// css imported globally

const PlayerDashboard = ({ players, currentDecisionMaker }) => {
    return (
        <div className="dashboard-container">
            {players.map((p) => (
                <div
                    key={p.id}
                    className={`player-card ${p.status === 'OUT' ? 'status-out' : 'status-in'} ${currentDecisionMaker === p.id ? 'status-deciding' : ''}`}
                >
                    <div className="player-header">
                        <span className="player-name">{p.name}</span>
                        <span className="player-status-icon">{p.status === 'IN' ? '🔦' : '⛺'}</span>
                    </div>

                    <div className="player-stats">
                        <div className="stat-row" title="已存入帐篷">
                            <span className="icon">⛺</span>
                            <span className="value">{p.gemsInTent}</span>
                        </div>
                        <div className="stat-row risk" title="探险中（有风险）">
                            <span className="icon">🖐️</span>
                            <span className="value">{p.gemsInHand}</span>
                        </div>
                    </div>

                    <div className="player-artifacts">
                        {p.artifacts.map((a, i) => (
                            <span key={i} className="artifact-icon" title={`神器：价值 ${a.value}`}>🗿</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlayerDashboard;
