/** Single-instance budget; never trust client IP headers or identifiers as a quota key. */
export class DiagnosisLimits {
  private minute: number[] = [];
  private day: number[] = [];
  private active = 0;
  constructor(
    private readonly perMinute = 5,
    private readonly perDay = 20,
    private readonly concurrent = 2,
  ) {}
  acquire(now = Date.now()): { release: () => void } | null {
    this.minute = this.minute.filter((t) => t > now - 60_000);
    this.day = this.day.filter((t) => t > now - 86_400_000);
    if (
      this.active >= this.concurrent ||
      this.minute.length >= this.perMinute ||
      this.day.length >= this.perDay
    )
      return null;
    this.minute.push(now);
    this.day.push(now);
    this.active++;
    let released = false;
    return {
      release: () => {
        if (!released) {
          this.active--;
          released = true;
        }
      },
    };
  }
}
