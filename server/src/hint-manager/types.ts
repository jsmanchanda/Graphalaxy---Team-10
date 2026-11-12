import type {Hint} from '../data-writer';

/** A hint the player has unlocked and can review. */
export type UnlockedHint = Omit<Hint, 'used'>;

/** The unlocked hint and the player's remaining hint credits. */
export interface HintUnlockResult {
  /** Null when the planet has no more hints to unlock. */
  hint: UnlockedHint | null;
  hintQuota: number;
}

/** Basic operations provided by the Hint Manager. */
export interface HintManagerService {
  /** Returns only hints this player has already unlocked on the planet. */
  getUnlockedHints(userId: number, planetId: number): UnlockedHint[];

  /** Unlocks the next hint, spending one credit when a hint is available. */
  unlockNextHint(userId: number, planetId: number): HintUnlockResult;

  /** Returns the player's current hint credit balance. */
  getBalance(userId: number): number;

  /** Adds earned credits and returns the updated balance; for server use. */
  awardHintCredits(userId: number, count: number): number;
}
