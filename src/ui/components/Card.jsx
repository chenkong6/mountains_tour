import React from 'react';
// css imported globally
import { CARD_TYPES } from '../../engine/types';

const Card = ({ card }) => {
    const getCardStyle = () => {
        switch (card.type) {
            case CARD_TYPES.TREASURE: return 'card-treasure';
            case CARD_TYPES.HAZARD: return 'card-hazard';
            case CARD_TYPES.ARTIFACT: return 'card-artifact';
            case 'TAKEN_ARTIFACT': return 'card-taken';
            default: return 'card-base';
        }
    };

    const getContent = () => {
        if (card.type === CARD_TYPES.TREASURE) {
            return (
                <div className="card-content">
                    <div className="card-value">{card.value}</div>
                    <div className="card-icon">💎</div>
                    <div className="card-label">宝石</div>
                </div>
            );
        }
        if (card.type === CARD_TYPES.HAZARD) {
            return (
                <div className="card-content">
                    <div className="card-icon-large">⚠️</div>
                    <div className="card-title">{card.label}</div>
                    <div className="card-flavor">{card.name}</div>
                </div>
            );
        }
        if (card.type === CARD_TYPES.ARTIFACT) {
            return (
                <div className="card-content">
                    <div className="card-icon-large">🗿</div>
                    <div className="card-title">神器</div>
                    <div className="card-value">{card.value}</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`game-card ${getCardStyle()}`}>
            <div className="card-inner">
                {getContent()}
            </div>
        </div>
    );
};

export default Card;
