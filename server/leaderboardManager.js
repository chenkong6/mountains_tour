import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'leaderboard.json');

class LeaderboardManager {
    constructor() {
        this.leaderboard = [];
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = fs.readFileSync(DATA_FILE, 'utf8');
                this.leaderboard = JSON.parse(data);
                console.log(`[Leaderboard] Loaded ${this.leaderboard.length} entries from ${DATA_FILE}`);
            } else {
                console.log('[Leaderboard] No existing data file found. Starting fresh.');
                this.leaderboard = [];
            }
        } catch (error) {
            console.error('[Leaderboard] Error loading leaderboard:', error);
            this.leaderboard = [];
        }
    }

    save() {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.leaderboard, null, 2));
            console.log(`[Leaderboard] Saved ${this.leaderboard.length} entries to ${DATA_FILE}`);
        } catch (error) {
            console.error('[Leaderboard] Error saving leaderboard:', error);
        }
    }

    /**
     * Updates leaderboard with new player results
     * @param {Array} players - Array of player objects with name and score
     */
    update(players) {
        console.log(`[Leaderboard] Updating with ${players.length} player results...`);
        // Format: 2026-01-16 15:37
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let addedCount = 0;
        players.forEach(p => {
            console.log(`[Leaderboard] Evaluating: ${p.name} (Score: ${p.score})`);
            if (p.score !== undefined && p.score > 0) {
                this.leaderboard.push({
                    name: p.name,
                    score: p.score,
                    timestamp: timestamp
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            // Sort by score descending, then by name
            this.leaderboard.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

            // Keep top 10
            const prevLen = this.leaderboard.length;
            this.leaderboard = this.leaderboard.slice(0, 10);
            console.log(`[Leaderboard] Added ${addedCount} entries. Total now: ${this.leaderboard.length}. (Dropped: ${prevLen - this.leaderboard.length})`);

            this.save();
        } else {
            console.log('[Leaderboard] No valid scores (>0) to add.');
        }
        return this.leaderboard;
    }

    get() {
        return this.leaderboard;
    }
}

export const leaderboardManager = new LeaderboardManager();
