import { CARD_TYPES, HAZARD_CONFIG, DECK_CONFIG, GAME_PHASES } from './types.js';

/**
 * Generates a fresh deck for the game.
 * @param {number} round 1-5
 * @param {string} mode REFRESH | PERSISTENT
 * @param {Array} removedHazards Array of hazard types that were removed
 * @returns {Array} Shuffled deck
 */
export function generateDeck(round, mode = 'REFRESH', removedHazards = []) {
    const deck = [];

    // Treasures
    DECK_CONFIG.TREASURES.forEach(val => {
        deck.push({ type: CARD_TYPES.TREASURE, value: val, id: `T-${val}-${Math.random()}` });
    });

    // Hazards
    Object.values(HAZARD_CONFIG).forEach(hazard => {
        let count = DECK_CONFIG.HAZARDS_PER_TYPE;

        // If persistent mode, check how many of this hazard were removed
        if (mode === 'PERSISTENT') {
            const removedCount = removedHazards.filter(h => h === hazard.id).length;
            count -= removedCount;
        }

        for (let i = 0; i < count; i++) {
            deck.push({
                type: CARD_TYPES.HAZARD,
                hazardType: hazard.id,
                name: hazard.name,
                label: hazard.label,
                id: `H-${hazard.id}-${i}`
            });
        }
    });

    return deck;
}

export function createInitialState(playerNames, gameMode = 'REFRESH') {
    return {
        gameMode,
        players: playerNames.map((name, i) => ({
            id: i,
            name,
            gemsInTent: 0,
            gemsInHand: 0,
            artifacts: [],
            status: 'IN', // IN, OUT
            roundGems: 0,
            roundArtifacts: 0,
            roundEndStatus: 'IN', // IN, SAFE, KILLED
        })),
        deck: [], // Current draw pile
        path: [], // Cards revealed on table
        gemsOnPath: [], // [0, 0, 3, 0...] corresponds to path cards leftovers

        round: 1,
        phase: GAME_PHASES.SETUP,

        artifactsDeck: [...DECK_CONFIG.ARTIFACT_VALUES], // Values of artifacts to receive progressively
        unclaimedArtifacts: [], // Artifacts from previous rounds not taken
        removedHazards: [], // Track removed hazards for PERSISTENT mode

        log: [`游戏已初始化。模式：${gameMode === 'PERSISTENT' ? '硬核 (卡牌永久移除)' : '常规 (每轮刷新)'}`],
        winner: null,
        lastRoundResults: null,
        currentRoundEndReason: null, // { type: 'DISASTER' | 'SUCCESS', hazard: hazardInfo }
    };
}

/**
 * Distributes gems from a treasure card to active players.
 */
function distributeGems(state, amount) {
    const activePlayers = state.players.filter(p => p.status === 'IN');
    const count = activePlayers.length;

    if (count === 0) return 0; // Should not happen if game continues

    const share = Math.floor(amount / count);
    const remainder = amount % count;

    activePlayers.forEach(p => {
        p.gemsInHand += share;
    });

    return remainder;
}

export function gameReducer(state, action) {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy for simplicity

    switch (action.type) {
        case 'START_ROUND': {
            // 1. Add new artifacts based on round number (R1:1, R2:2...)
            const artifactCards = [];
            const artifactsToPull = newState.round;
            for (let i = 0; i < artifactsToPull; i++) {
                if (newState.artifactsDeck.length > 0) {
                    const val = newState.artifactsDeck.shift();
                    artifactCards.push({
                        type: CARD_TYPES.ARTIFACT,
                        value: val,
                        id: `A-${val}-${newState.round}-${i}`
                    });
                }
            }

            const baseDeck = generateDeck(newState.round, newState.gameMode, newState.removedHazards);
            artifactCards.forEach(c => baseDeck.push(c));
            newState.unclaimedArtifacts.forEach(a => baseDeck.push(a));
            newState.unclaimedArtifacts = []; // They are in deck now

            // Shuffle again
            for (let i = baseDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [baseDeck[i], baseDeck[j]] = [baseDeck[j], baseDeck[i]];
            }

            newState.deck = baseDeck;
            newState.path = [];
            newState.gemsOnPath = [];
            newState.players.forEach(p => {
                p.status = 'IN';
                p.gemsInHand = 0;
                p.roundGems = 0;
                p.roundArtifacts = 0;
                p.roundEndStatus = 'IN';
            });
            newState.currentRoundEndReason = null;
            newState.phase = GAME_PHASES.REVEAL;
            return gameReducer(newState, { type: 'REVEAL_CARD' });
        }

        case 'REVEAL_CARD': {
            if (newState.deck.length === 0) {
                return gameReducer(newState, { type: 'END_ROUND' });
            }

            const card = newState.deck.shift();
            newState.path.push(card);

            if (card.type === CARD_TYPES.TREASURE) {
                const remainder = distributeGems(newState, card.value);
                newState.gemsOnPath.push(remainder);
                newState.log.push(`揭晓宝藏：${card.value} 颗宝石。`);
            } else if (card.type === CARD_TYPES.HAZARD) {
                newState.gemsOnPath.push(0);
                newState.log.push(`揭晓灾难：${card.label}！`);

                const sameHazards = newState.path.filter(c => c.type === CARD_TYPES.HAZARD && c.hazardType === card.hazardType);
                if (sameHazards.length >= 2) {
                    newState.log.push(`灾难降临！出现了第二个 ${card.label}！探险者们空手而归。`);

                    if (newState.gameMode === 'PERSISTENT') {
                        newState.removedHazards.push(card.hazardType);
                        newState.log.push(`【重要】一个 ${card.label} 陷阱已被破坏，未来这种灾难出现的概率降低。`);
                    }

                    newState.currentRoundEndReason = { type: 'DISASTER', hazard: card };

                    newState.players.forEach(p => {
                        if (p.status === 'IN') {
                            p.gemsInHand = 0;
                            p.roundGems = 0;
                            p.roundArtifacts = 0;
                            p.roundEndStatus = 'KILLED';
                            p.status = 'OUT';
                        }
                    });
                    return gameReducer(newState, { type: 'END_ROUND' });
                }
            } else if (card.type === CARD_TYPES.ARTIFACT) {
                newState.gemsOnPath.push(0);
                newState.log.push(`揭晓神器！价值：${card.value}`);
            }

            newState.phase = GAME_PHASES.DECISION;
            return newState;
        }

        case 'DECISIONS_MADE': {
            const decisions = action.decisions;
            const leavingPlayers = [];

            newState.players.forEach(p => {
                if (p.status === 'IN' && decisions[p.id] === 'LEAVE') {
                    leavingPlayers.push(p);
                }
            });

            if (leavingPlayers.length > 0) {
                const count = leavingPlayers.length;
                let totalLoot = 0;
                newState.gemsOnPath = newState.gemsOnPath.map(gems => {
                    if (gems === 0) return 0;
                    const share = Math.floor(gems / count);
                    totalLoot += share;
                    return gems % count;
                });

                if (count === 1) {
                    const player = leavingPlayers[0];
                    const artifactsOnPathIndices = [];
                    newState.path.forEach((c, idx) => {
                        if (c.type === CARD_TYPES.ARTIFACT) artifactsOnPathIndices.push(idx);
                    });

                    artifactsOnPathIndices.forEach(idx => {
                        const art = newState.path[idx];
                        player.artifacts.push(art);
                        newState.path[idx] = { ...art, type: 'TAKEN_ARTIFACT' };
                    });

                    if (artifactsOnPathIndices.length > 0) {
                        player.roundArtifacts += artifactsOnPathIndices.length;
                        newState.log.push(`${player.name} 带着神器逃脱了！`);
                    }
                }

                leavingPlayers.forEach(p => {
                    const gainedGems = p.gemsInHand + totalLoot;
                    p.gemsInTent += gainedGems;
                    p.roundGems += gainedGems;
                    p.gemsInHand = 0;
                    p.status = 'OUT';
                    p.roundEndStatus = 'SAFE';
                    newState.log.push(`${p.name} 携带 ${gainedGems} 宝石返回了营地。`);
                });
            }

            const activeCount = newState.players.filter(p => p.status === 'IN').length;
            if (activeCount === 0) {
                return gameReducer(newState, { type: 'END_ROUND' });
            } else {
                return gameReducer(newState, { type: 'REVEAL_CARD' });
            }
        }

        case 'END_ROUND': {
            newState.log.push(`第 ${newState.round} 轮结束。`);

            if (!newState.currentRoundEndReason) {
                newState.currentRoundEndReason = { type: 'SUCCESS' };
            }

            const roundResults = newState.players.map(p => {
                return {
                    name: p.name,
                    gemsGained: p.roundGems || 0,
                    artifactsGained: p.roundArtifacts || 0,
                    status: p.roundEndStatus || 'SAFE'
                };
            });
            newState.lastRoundResults = roundResults;

            newState.round += 1;

            newState.path.forEach(c => {
                if (c.type === CARD_TYPES.ARTIFACT) {
                    newState.unclaimedArtifacts.push(c);
                }
            });

            if (newState.round > 5) {
                newState.phase = GAME_PHASES.GAME_END;
                let winner = newState.players[0];
                newState.players.forEach(p => {
                    p.score = p.gemsInTent + p.artifacts.reduce((acc, a) => acc + a.value, 0);
                    if (p.score > (winner.score || 0)) winner = p;
                });
                newState.winner = winner;
                newState.log.push(`游戏结束！获胜者：${winner.name}`);
            } else {
                newState.phase = GAME_PHASES.ROUND_START;
            }
            return newState;
        }
    }
    return newState;
}
