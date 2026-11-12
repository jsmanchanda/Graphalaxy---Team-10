import type {DataWriter, Hint, User} from '../data-writer';
import type {
  HintErrorCode,
  HintManagerService,
  HintUnlockResult,
  UnlockedHint,
} from './types';

/** A hint failure; keep the internal cause out of client responses. */
export class HintManagerError extends Error {
  /** Preserves a dependency failure for server-side diagnostics. */
  constructor(
    readonly code: HintErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'HintManagerError';
  }
}

/** Manages planet hints and player credits through the existing Data Writer. */
export class HintManager implements HintManagerService {
  /** Uses the existing repositories and their shared transaction boundary. */
  constructor(
    private readonly dataWriter: Pick<
      DataWriter,
      'users' | 'content' | 'hints' | 'transaction'
    >,
  ) {}

  /** Reviewing previously unlocked hints is free. */
  getUnlockedHints(userId: number, planetId: number): UnlockedHint[] {
    return this.withStorageError('Unable to load unlocked hints.', () => {
      this.requireUser(userId);
      this.requirePlanet(planetId);
      return this.dataWriter.hints
        .list(userId, planetId)
        .filter(hint => hint.used)
        .map(hint => this.toUnlockedHint(hint));
    });
  }

  /** Spending a credit and saving the unlock succeed or roll back together. */
  unlockNextHint(userId: number, planetId: number): HintUnlockResult {
    return this.withStorageError('Unable to unlock the next hint.', () =>
      this.dataWriter.transaction(() => {
        const user = this.requireUser(userId);
        this.requirePlanet(planetId);
        // The Data Writer returns hints in hint_number order.
        const next = this.dataWriter.hints
          .list(userId, planetId)
          .find(hint => !hint.used);
        if (!next) return {hint: null, hintQuota: user.hintQuota};

        if (!this.dataWriter.users.spendHint(userId)) {
          throw new HintManagerError(
            'NO_HINTS_LEFT',
            'You need a hint credit to unlock another hint.',
          );
        }
        this.dataWriter.hints.markUsed(userId, next.hintId);
        return {
          hint: this.toUnlockedHint(next),
          hintQuota: this.requireUser(userId).hintQuota,
        };
      }),
    );
  }

  /** Returns the current number of hints available to this player. */
  getBalance(userId: number): number {
    return this.withStorageError(
      'Unable to load hint credits.',
      () => this.requireUser(userId).hintQuota,
    );
  }

  /** Called by server after it verifies a minigame reward. */
  awardHintCredits(userId: number, count: number): number {
    this.requirePositiveInteger(count, 'Credit count');
    return this.withStorageError('Unable to award hint credits.', () =>
      this.dataWriter.transaction(() => {
        const user = this.requireUser(userId);
        if (!Number.isSafeInteger(user.hintQuota + count)) {
          throw new HintManagerError(
            'INVALID_INPUT',
            'The resulting hint balance is too large.',
          );
        }
        this.dataWriter.users.addHints(userId, count);
        return this.requireUser(userId).hintQuota;
      }),
    );
  }

  private requireUser(userId: number): User {
    this.requirePositiveInteger(userId, 'User ID');
    const user = this.dataWriter.users.findById(userId);
    if (!user) {
      throw new HintManagerError('NOT_FOUND', `User ${userId} does not exist.`);
    }
    return user;
  }

  private requirePlanet(planetId: number): void {
    this.requirePositiveInteger(planetId, 'Planet ID');
    if (!this.dataWriter.content.getPlanet(planetId)) {
      throw new HintManagerError(
        'NOT_FOUND',
        `Planet ${planetId} does not exist.`,
      );
    }
  }

  private requirePositiveInteger(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new HintManagerError(
        'INVALID_INPUT',
        `${name} must be a positive safe integer.`,
      );
    }
  }

  private toUnlockedHint(hint: Hint): UnlockedHint {
    return {
      hintId: hint.hintId,
      planetId: hint.planetId,
      hintNumber: hint.hintNumber,
      text: hint.text,
    };
  }

  private withStorageError<T>(message: string, work: () => T): T {
    try {
      return work();
    } catch (cause) {
      if (cause instanceof HintManagerError) throw cause;
      throw new HintManagerError('STORAGE_ERROR', message, cause);
    }
  }
}
