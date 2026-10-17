export type TokenPair = {
  token: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshExpiresAtUtc: string;
};

export type RefreshOutcome = { ok: true; pair: TokenPair } | { ok: false; status: number };

type Refresher = (refreshToken: string, clientAddress: string | undefined) => Promise<RefreshOutcome>;

// How long a successful refresh is remembered. The backend spends a refresh token once and treats
// a second presentation as a possible theft, so requests that arrive together, or a moment after
// the first has finished while their cookie still holds the old token, must not each present it.
// Roughly the backend's own grace for exactly this race.
const REMEMBER_MS = 10_000;

/**
 * One refresh per sign-in at a time. A page makes several API calls at once; when the access
 * token has just expired they all find out together, and without this each would refresh with the
 * same token and all but one would be refused.
 *
 * This is per server process. With several copies behind a load balancer two of them could
 * present the same token; the backend's grace window absorbs that race for the first seconds.
 */
export class RefreshCoordinator {
  private readonly inFlight = new Map<string, Promise<RefreshOutcome>>();
  private readonly recent = new Map<string, { outcome: RefreshOutcome; at: number }>();

  // Plain fields rather than constructor parameter properties: the tests run as TypeScript
  // directly under Node's type stripping, which does not allow that syntax.
  private readonly refresher: Refresher;
  private readonly now: () => number;

  constructor(refresher: Refresher, now: () => number = Date.now) {
    this.refresher = refresher;
    this.now = now;
  }

  async refresh(refreshToken: string, clientAddress: string | undefined): Promise<RefreshOutcome> {
    const remembered = this.recent.get(refreshToken);
    if (remembered && this.now() - remembered.at < REMEMBER_MS) return remembered.outcome;
    this.recent.delete(refreshToken);

    const running = this.inFlight.get(refreshToken);
    if (running) return running;

    const started = this.refresher(refreshToken, clientAddress)
      .then((outcome) => {
        // Only a success is remembered: a failure may be a passing fault, and trying again is right.
        if (outcome.ok) this.recent.set(refreshToken, { outcome, at: this.now() });
        this.prune();
        return outcome;
      })
      .finally(() => this.inFlight.delete(refreshToken));

    this.inFlight.set(refreshToken, started);
    return started;
  }

  private prune(): void {
    const cutoff = this.now() - REMEMBER_MS;
    for (const [key, value] of this.recent) {
      if (value.at < cutoff) this.recent.delete(key);
    }
  }
}
