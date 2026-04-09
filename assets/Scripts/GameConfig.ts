/**
 * Central game configuration — all tuneable constants live here.
 *
 * This is a plain class (not a Component) so it can be instantiated,
 * serialised, or replaced with data fetched from a remote server.
 *
 * Usage:
 *   import { GameConfig } from './GameConfig';
 *   const cfg = GameConfig.instance;       // singleton (local defaults)
 *   cfg.betAmount;                         // 50
 *
 * To load from server later, call:
 *   await GameConfig.loadFromServer('https://api.example.com/config');
 */
export class GameConfig {

    // ── Singleton ────────────────────────────────────────────
    private static _instance: GameConfig | null = null;

    public static get instance(): GameConfig {
        if (!GameConfig._instance) {
            GameConfig._instance = new GameConfig();
        }
        return GameConfig._instance;
    }

    // ── Balance ──────────────────────────────────────────────
    public startingBalance: number = 1000;
    public betAmount: number = 50;

    // ── Odds (must sum to 1.0) ───────────────────────────────
    public loseChance: number = 0.60;
    public smallWinChance: number = 0.30;
    public bigWinChance: number = 0.10;

    // ── Payouts ──────────────────────────────────────────────
    public smallWinPayout: number = 100;
    public bigWinPayout: number = 300;

    // ── Reel animation ───────────────────────────────────────
    public reelCount: number = 3;
    public symbolsPerReel: number = 3;
    public reelSymbols: string[] = ['🍒', '🍋', '⭐', '🔔', '💎'];
    public reelDurations: number[] = [1.0, 1.3, 1.6];
    public symbolHeight: number = 80;

    // ── Derived thresholds (recomputed after load) ───────────
    public get loseThreshold(): number {
        return this.loseChance;
    }
    public get smallWinThreshold(): number {
        return this.loseChance + this.smallWinChance;
    }

    // ── Server loading ───────────────────────────────────────

    /**
     * Fetch config JSON from a remote endpoint and merge into the
     * singleton. Any keys present in the JSON overwrite the defaults.
     *
     * Example JSON:
     * { "betAmount": 100, "bigWinPayout": 500, "loseChance": 0.50 }
     */
    public static async loadFromServer(url: string): Promise<GameConfig> {
        const cfg = GameConfig.instance;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`[GameConfig] Server returned ${response.status}, using defaults.`);
                return cfg;
            }
            const data = await response.json();
            GameConfig._applyOverrides(cfg, data);
            console.log('[GameConfig] Loaded from server:', url);
        } catch (err) {
            console.warn('[GameConfig] Failed to fetch config, using defaults:', err);
        }
        return cfg;
    }

    /**
     * Apply a plain object of overrides (e.g. from JSON) onto the config.
     * Only known keys are applied; unknown keys are ignored.
     */
    public static applyOverrides(overrides: Record<string, unknown>): void {
        GameConfig._applyOverrides(GameConfig.instance, overrides);
    }

    private static _applyOverrides(cfg: GameConfig, data: Record<string, unknown>): void {
        const validKeys: (keyof GameConfig)[] = [
            'startingBalance', 'betAmount',
            'loseChance', 'smallWinChance', 'bigWinChance',
            'smallWinPayout', 'bigWinPayout',
            'reelCount', 'symbolsPerReel', 'reelSymbols',
            'reelDurations', 'symbolHeight',
        ];
        for (const key of validKeys) {
            if (key in data) {
                (cfg as any)[key] = data[key];
            }
        }
    }

    /** Replace the singleton (useful for testing). */
    public static resetToDefaults(): void {
        GameConfig._instance = new GameConfig();
    }
}
