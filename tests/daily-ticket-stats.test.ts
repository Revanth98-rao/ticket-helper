import { describe, it, expect } from "bun:test";

export interface TestTicket {
  id: string;
  createdAt: Date;
  status: string;
  autoResolved?: boolean;
}

export function computeDailyTicketStats(
  tickets: TestTicket[],
  referenceDate: Date = new Date(),
  daysCount = 30
) {
  const resultDays: Array<{
    date: string;
    label: string;
    dayOfWeek: string;
    count: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    ai_resolved: number;
  }> = [];

  const dateMap = new Map<string, (typeof resultDays)[number]>();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

    const entry = {
      date: dateStr,
      label,
      dayOfWeek,
      count: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      ai_resolved: 0,
    };
    dateMap.set(dateStr, entry);
    resultDays.push(entry);
  }

  for (const t of tickets) {
    const dateStr = t.createdAt.toISOString().slice(0, 10);
    const entry = dateMap.get(dateStr);
    if (entry) {
      entry.count += 1;
      if (t.autoResolved) {
        entry.ai_resolved += 1;
      } else if (t.status === "open") {
        entry.open += 1;
      } else if (t.status === "in_progress") {
        entry.in_progress += 1;
      } else if (t.status === "resolved") {
        entry.resolved += 1;
      } else if (t.status === "closed") {
        entry.closed += 1;
      }
    }
  }

  const totalTickets = resultDays.reduce((acc, d) => acc + d.count, 0);
  const averagePerDay = Number((totalTickets / daysCount).toFixed(1));

  let peakDay = resultDays[0] || { date: "", count: 0, label: "" };
  for (const d of resultDays) {
    if (d.count > peakDay.count) {
      peakDay = d;
    }
  }

  return {
    days: resultDays,
    summary: {
      totalTickets,
      averagePerDay,
      peakDay: {
        date: peakDay.date,
        label: peakDay.label,
        count: peakDay.count,
      },
      startDate: resultDays[0]?.date || "",
      endDate: resultDays[resultDays.length - 1]?.date || "",
    },
  };
}

describe("30-Day Daily Ticket Volume Aggregation", () => {
  const refDate = new Date("2026-10-25T12:00:00.000Z");

  it("generates exactly 30 consecutive calendar days ending on the reference date", () => {
    const stats = computeDailyTicketStats([], refDate, 30);
    expect(stats.days.length).toBe(30);
    expect(stats.days[0].date).toBe("2026-09-26");
    expect(stats.days[29].date).toBe("2026-10-25");
    expect(stats.summary.startDate).toBe("2026-09-26");
    expect(stats.summary.endDate).toBe("2026-10-25");
  });

  it("handles zero tickets gracefully with all zero counts and 0.0 average", () => {
    const stats = computeDailyTicketStats([], refDate, 30);
    expect(stats.summary.totalTickets).toBe(0);
    expect(stats.summary.averagePerDay).toBe(0);
    expect(stats.summary.peakDay.count).toBe(0);
    for (const day of stats.days) {
      expect(day.count).toBe(0);
    }
  });

  it("correctly buckets tickets on matching dates and computes total & peak day", () => {
    const mockTickets: TestTicket[] = [
      { id: "1", createdAt: new Date("2026-10-25T08:00:00.000Z"), status: "open" },
      { id: "2", createdAt: new Date("2026-10-25T10:00:00.000Z"), status: "resolved" },
      { id: "3", createdAt: new Date("2026-10-25T11:00:00.000Z"), status: "open", autoResolved: true },
      { id: "4", createdAt: new Date("2026-10-20T14:00:00.000Z"), status: "in_progress" },
      { id: "5", createdAt: new Date("2026-10-20T15:00:00.000Z"), status: "open" },
      { id: "6", createdAt: new Date("2026-10-20T16:00:00.000Z"), status: "open" },
      { id: "7", createdAt: new Date("2026-10-20T17:00:00.000Z"), status: "open" },
    ];

    const stats = computeDailyTicketStats(mockTickets, refDate, 30);
    expect(stats.summary.totalTickets).toBe(7);
    expect(stats.summary.averagePerDay).toBe(0.2);

    const oct25 = stats.days.find((d) => d.date === "2026-10-25");
    expect(oct25).toBeDefined();
    expect(oct25?.count).toBe(3);
    expect(oct25?.open).toBe(1);
    expect(oct25?.resolved).toBe(1);
    expect(oct25?.ai_resolved).toBe(1);

    const oct20 = stats.days.find((d) => d.date === "2026-10-20");
    expect(oct20).toBeDefined();
    expect(oct20?.count).toBe(4);
    expect(oct20?.in_progress).toBe(1);
    expect(oct20?.open).toBe(3);

    expect(stats.summary.peakDay.date).toBe("2026-10-20");
    expect(stats.summary.peakDay.count).toBe(4);
  });

  it("ignores tickets created outside the 30-day window", () => {
    const mockTickets: TestTicket[] = [
      { id: "old", createdAt: new Date("2026-08-01T00:00:00.000Z"), status: "resolved" },
      { id: "recent", createdAt: new Date("2026-10-25T01:00:00.000Z"), status: "open" },
    ];

    const stats = computeDailyTicketStats(mockTickets, refDate, 30);
    expect(stats.summary.totalTickets).toBe(1);
    const oct25 = stats.days.find((d) => d.date === "2026-10-25");
    expect(oct25?.count).toBe(1);
  });
});

