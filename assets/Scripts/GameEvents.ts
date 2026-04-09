/**
 * Central registry of all game event names used with `director.emit()` /
 * `director.on()`.  Every component imports only this file — never each other.
 *
 * Naming convention:  NOUN_VERB  (past tense for "something happened",
 * imperative for "request that something happens").
 */
export const GameEvents = {

    // ── UI → Game (requests) ─────────────────────────────────
    /** Player tapped SPIN. No payload. */
    SPIN_REQUESTED: 'spin:requested',

    /** Player tapped RESET. No payload. */
    RESET_REQUESTED: 'reset:requested',

    // ── Game → world (state changes) ─────────────────────────
    /** Bet accepted, credits deducted.  Payload: { balance: number } */
    BET_PLACED: 'bet:placed',

    /** Bet rejected (insufficient credits).  No payload. */
    BET_REJECTED: 'bet:rejected',

    /** Balance changed (after bet, win, or reset).  Payload: { balance: number } */
    BALANCE_CHANGED: 'balance:changed',

    /** Spin result determined.  Payload: { result: SpinResult, payout: number, balance: number } */
    SPIN_RESULT: 'spin:result',

    /** Game state has been reset.  Payload: { balance: number } */
    GAME_RESET: 'game:reset',

    // ── Reels ────────────────────────────────────────────────
    /** All reels have finished animating.  No payload. */
    REELS_STOPPED: 'reels:stopped',

    /** Request reels to start spinning.  No payload. */
    REELS_START: 'reels:start',

    /** Request reels to randomise (e.g. on reset).  No payload. */
    REELS_RANDOMISE: 'reels:randomise',
} as const;
