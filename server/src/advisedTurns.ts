type AdvisedTurn = { id: string; stage: string; turnDeadline?: number };

export class AdvisedTurns {
  private turns = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  private key(hand: AdvisedTurn, playerId: string) {
    return `${hand.id}:${playerId}:${hand.stage}:${hand.turnDeadline ?? ''}`;
  }

  mark(hand: AdvisedTurn, playerId: string) {
    const now = this.now();
    this.turns.forEach((expiresAt, key) => { if (expiresAt < now) this.turns.delete(key); });
    this.turns.set(this.key(hand, playerId), Math.max(now + 5_000, Number(hand.turnDeadline) + 1_000));
  }

  consume(hand: AdvisedTurn, playerId: string) {
    const key = this.key(hand, playerId);
    const expiresAt = this.turns.get(key);
    this.turns.delete(key);
    return typeof expiresAt === 'number' && expiresAt >= this.now();
  }
}
