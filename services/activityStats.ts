/** Actual transaction counts per Korean calendar day, including inactive days. */
export function dailyActivity(transactions: { date: string }[]) {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const timestamp = Date.parse(transaction.date);
    if (!Number.isFinite(timestamp)) continue;
    const day = new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const days = [...counts.keys()].sort();
  if (!days.length) return [];
  const result: { label: string; activity: number }[] = [];
  for (let time = Date.parse(days[0]); time <= Date.parse(days[days.length - 1]); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    result.push({ label: day, activity: counts.get(day) || 0 });
  }
  return result;
}
