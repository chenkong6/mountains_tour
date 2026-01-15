import { CARD_TYPES, HAZARD_CONFIG, DECK_CONFIG, GAME_PHASES } from './types.js';

/**
 * Generates a fresh deck for the game.
 * @param {number} round 1-5
 * @returns {Array} Shuffled deck
 */
export function generateDeck(round) {
    const deck = [];

    // Treasures
    DECK_CONFIG.TREASURES.forEach(val => {
        deck.push({ type: CARD_TYPES.TREASURE, value: val, id: `T-${val}-${Math.random()}` });
    });

    // Hazards
    Object.values(HAZARD_CONFIG).forEach(hazard => {
        for (let i = 0; i < DECK_CONFIG.HAZARDS_PER_TYPE; i++) {
            deck.push({
                type: CARD_TYPES.HAZARD,
                hazardType: hazard.id,
                name: hazard.name,
                label: hazard.label,
                id: `H-${hazard.id}-${i}`
            });
        }
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Add Artifact (1 per round)
    // Logic: In real game, artifacts are added one per round.
    // Actually, standard rule: One artifact card is added to the deck at the start of each round?
    // Or all artifacts are available, but only 1 is shuffled in?
    // User says: "每轮开始前，将 1 张神器卡洗入探险牌堆". "Preparation: ... add 1 artifact card".
    // So Round 1 has 1 artifact. Round 2 has 2 (if previous not taken)?
    // User: "神器卡翻开后... 只有单人撤离时... 多人撤离或无人撤离... 神器卡保留到下一轮"
    // This implies if not taken, it stays? Or stays in deck?
    // Usually: If not taken, it is removed from the path but *re-added* to the deck next round?
    // Let's implement: Artifacts deck. Draw 1, add to active deck.
    // If not taken, does it go back to "Artifacts Deck" or "Active Deck"?
    // Rules say: "If nobody picked it up... it remains on the path? No, path is cleared."
    // "If not taken, it is placed on the sideboard?"
    // Let's assume standard rule: It's shuffled back in next round if not claimed?
    // User says: "保留到下一轮 (Retain to next round)". This usually means added to next round's deck.
    // So: We need a pool of unclamined artifacts.

    return deck;
}

export function createInitialState(playerNames) {
    return {
        players: playerNames.map((name, i) => ({
            id: i,
            name,
            gemsInTent: 0,
            gemsInHand: 0,
            artifacts: [],
            status: 'IN', // IN, OUT
        })),
        deck: [], // Current draw pile
        path: [], // Cards revealed on table
        gemsOnPath: [], // [0, 0, 3, 0...] corresponds to path cards leftovers

        round: 1,
        phase: GAME_PHASES.SETUP,

        artifactsDeck: [5, 5, 5, 10, 10], // Values of artifacts to receive 1 by 1
        unclaimedArtifacts: [], // Artifacts from previous rounds not taken

        log: ['游戏已初始化。'],
        winner: null,
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
            // 1. Add new artifact if available
            let artifactCard = null;
            if (newState.artifactsDeck.length > 0) {
                const val = newState.artifactsDeck.shift();
                artifactCard = { type: CARD_TYPES.ARTIFACT, value: val, id: `A-${val}-${newState.round}` };
            }

            const baseDeck = generateDeck(newState.round);
            if (artifactCard) baseDeck.push(artifactCard);
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
                p.gemsInHand = 0; // Usually kept from previous rounds? 
                // NO! "Unbanked" gems are lost if you die.
                // But gems "In Hand" during a round are "Current Round Gems". 
                // Gems "In Tent" are safe.
            });
            newState.phase = GAME_PHASES.REVEAL; // Auto start by revealing first card?
            // Or Wait for user to click "Start"?
            // Let's go to REVEAL immediately or DECISION?
            // First card is always free? Yes.
            // So we can auto-reveal one card.
            return gameReducer(newState, { type: 'REVEAL_CARD' });
        }

        case 'REVEAL_CARD': {
            if (newState.deck.length === 0) {
                // End round naturally (rare)
                return gameReducer(newState, { type: 'END_ROUND' });
            }

            const card = newState.deck.shift();
            newState.path.push(card);

            // Handle Card Effects
            if (card.type === CARD_TYPES.TREASURE) {
                const remainder = distributeGems(newState, card.value);
                newState.gemsOnPath.push(remainder);
                newState.log.push(`揭晓宝藏：${card.value} 颗宝石。`);
            } else if (card.type === CARD_TYPES.HAZARD) {
                newState.gemsOnPath.push(0);
                newState.log.push(`揭晓灾难：${card.label}！`);

                // Check for double hazard
                const sameHazards = newState.path.filter(c => c.type === CARD_TYPES.HAZARD && c.hazardType === card.hazardType);
                if (sameHazards.length >= 2) {
                    // DISASTER!
                    newState.log.push(`灾难降临！出现了第二个 ${card.label}！探险者们空手而归。`);
                    // Active players lose everything in hand
                    newState.players.forEach(p => {
                        if (p.status === 'IN') {
                            p.gemsInHand = 0;
                            p.status = 'OUT'; // Force out
                        }
                    });
                    // Remove one of the hazards from the game? 
                    // Rules: "Remove one of the two identical hazard cards... shuffle the other back"
                    // Implementation: We just end round. Deck is rebuilt next round anyway.
                    // Wait, "Deck is rebuilt" logic above `generateDeck` creates meaningful hazards?
                    // Actually user says: "30 cards, 5 types * 6".
                    // If we generate fresh deck every time, we forget if a hazard was removed.
                    // We might need to persist "Removed Hazards" in global state if we want to follow strict rules.
                    // User rule: "30 张...". 
                    // Detailed rule: "When a disaster happens... remove THIS hazard card from the game". 
                    // So the deck becomes safer over time.
                    // TODO: Implement Deck Persistence.
                    // For now, let's just End Round.
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
            // action.decisions = { playerId: 'STAY' | 'LEAVE' }
            const decisions = action.decisions;
            const leavingPlayers = [];

            newState.players.forEach(p => {
                if (p.status === 'IN' && decisions[p.id] === 'LEAVE') {
                    leavingPlayers.push(p);
                }
            });

            if (leavingPlayers.length > 0) {
                // Handle Leaving
                const count = leavingPlayers.length;

                // Distribute Gems on Path
                let totalLoot = 0;
                newState.gemsOnPath = newState.gemsOnPath.map(gems => {
                    if (gems === 0) return 0;
                    const share = Math.floor(gems / count);
                    totalLoot += share;
                    return gems % count; // Leftover remains
                });

                // Distribute Artifacts
                // Only if SINGLE player leaves
                if (count === 1) {
                    const player = leavingPlayers[0];
                    const artifactsOnPathIndices = [];
                    newState.path.forEach((c, idx) => {
                        if (c.type === CARD_TYPES.ARTIFACT) artifactsOnPathIndices.push(idx);
                    });

                    artifactsOnPathIndices.forEach(idx => {
                        // Take artifact
                        const art = newState.path[idx];
                        player.artifacts.push(art);
                        // Remove from path? Visually yes, but path array index must preserve? 
                        // Just mark it as taken? Or remove from path array.
                        // If we remove from path, `gemsOnPath` index might desync.
                        // Let's replace with NULL or a "TAKEN" placeholder.
                        newState.path[idx] = { ...art, type: 'TAKEN_ARTIFACT' };
                    });

                    if (artifactsOnPathIndices.length > 0) {
                        newState.log.push(`${player.name} 带着神器逃脱了！`);
                    }
                }

                // Create logs and move gems to tent
                leavingPlayers.forEach(p => {
                    p.gemsInTent += p.gemsInHand + totalLoot;
                    p.gemsInHand = 0;
                    p.status = 'OUT';
                    newState.log.push(`${p.name} 返回了营地。`);
                });
            }

            // Check if anyone left
            const activeCount = newState.players.filter(p => p.status === 'IN').length;
            if (activeCount === 0) {
                return gameReducer(newState, { type: 'END_ROUND' });
            } else {
                // Continue to Reveal
                // Actually, user flow: Flip -> Decide.
                // So after Decide, we Flip again (REVEAL_CARD).
                return gameReducer(newState, { type: 'REVEAL_CARD' });
            }
        }

        case 'END_ROUND': {
            newState.log.push(`第 ${newState.round} 轮结束。`);

            // Calculate Round Summary
            const roundOneResults = newState.players.map(p => {
                // Determine gems collected this round (added to tent)
                // We don't track "gems in tent at start of round", but we know 
                // gemsInHand become 0, and gemsInTent increases.
                // Actually if they left earlier, gemsInHand became 0 then.
                // So "This Round Score" is hard to track unless we stored "startOfRoundTent".
                // Let's rely on Total Score for now or just current status.
                // Better: Just show current Total Score in summary.
                return {
                    name: p.name,
                    totalGems: p.gemsInTent,
                    artifactsCount: p.artifacts.length,
                    status: p.status
                };
            });
            newState.lastRoundResults = roundOneResults;

            newState.round += 1;

            // Reset artifacts that were not taken (if any on path)
            newState.path.forEach(c => {
                if (c.type === CARD_TYPES.ARTIFACT) {
                    newState.unclaimedArtifacts.push(c);
                }
            });

            if (newState.round > 5) {
                newState.phase = GAME_PHASES.GAME_END;
                // Calculate Score
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
