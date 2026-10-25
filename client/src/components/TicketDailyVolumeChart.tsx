import React, { useState } from "react";
import { BarChart3, TrendingUp, Calendar, Info } from "lucide-react";
import { useTicketDailyStats, DailyTicketStat } from "../hooks/useTickets";

export default function TicketDailyVolumeChart() {
  const { data, isLoading, isError, refetch } = useTicketDailyStats();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div
        data-testid="ticket-daily-volume-chart"
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-64 bg-slate-100 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="h-52 bg-slate-50 rounded-lg border border-slate-100" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        data-testid="ticket-daily-volume-chart"
        className="bg-white p-6 rounded-xl border border-red-200 bg-red-50/20 shadow-xs flex items-center justify-between"
      >
        <div>
          <h4 className="text-sm font-semibold text-red-900">Unable to load daily ticket volume</h4>
          <p className="text-xs text-red-600 mt-0.5">There was an issue fetching 30-day ticket statistics.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs font-semibold px-3 py-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { days, summary } = data;

  // Compute maximum scale ceiling rounded up to nearest 5 or 10
  const maxRawCount = Math.max(...days.map((d) => d.count), 0);
  const maxScale = Math.max(Math.ceil((maxRawCount || 1) / 5) * 5, 5);

  // Y-axis grid step markers (4 intervals)
  const ySteps = [maxScale, Math.round(maxScale * 0.75), Math.round(maxScale * 0.5), Math.round(maxScale * 0.25), 0];

  const hoveredDay: DailyTicketStat | null = hoveredIndex !== null ? days[hoveredIndex] : null;

  return (
    <div
      data-testid="ticket-daily-volume-chart"
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5"
    >
      {/* Header section with title, description, and summary KPI chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80 shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Ticket Volume (Past 30 Days)</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                <Calendar className="w-3 h-3" />
                30 Days
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total number of support tickets created per day from{" "}
              <span className="font-medium text-slate-700">{summary.startDate}</span> to{" "}
              <span className="font-medium text-slate-700">{summary.endDate}</span>
            </p>
          </div>
        </div>

        {/* 30-Day Summary Metrics Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">30d Total</span>
            <span className="text-sm font-extrabold text-slate-900">{summary.totalTickets} tickets</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Daily Avg</span>
            <span className="text-sm font-extrabold text-slate-900">{summary.averagePerDay} / day</span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-500 block tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Peak Day
            </span>
            <span className="text-sm font-extrabold text-blue-700">
              {summary.peakDay.count} on {summary.peakDay.label || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="relative pt-4 pb-2">
        <div className="flex h-52 sm:h-56">
          {/* Y-Axis scale labels */}
          <div className="w-9 sm:w-11 flex flex-col justify-between items-end pr-2 select-none">
            {ySteps.map((stepVal, idx) => (
              <span key={idx} className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-none">
                {stepVal}
              </span>
            ))}
          </div>

          {/* Chart Bars and Grid Container */}
          <div className="flex-1 relative h-full flex flex-col justify-end">
            {/* Horizontal Grid Guide Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
              {ySteps.map((_, idx) => (
                <div key={idx} className="w-full border-b border-slate-100 border-dashed" />
              ))}
            </div>

            {/* Bars Column Container */}
            <div className="relative z-10 w-full h-full flex items-end justify-between gap-1 sm:gap-1.5 px-1">
              {days.map((day, idx) => {
                const heightPercent = maxScale > 0 ? (day.count / maxScale) * 100 : 0;
                const isHovered = hoveredIndex === idx;
                const isPeak = day.count > 0 && day.count === summary.peakDay.count;
                const isToday = idx === days.length - 1;

                return (
                  <div
                    key={day.date}
                    data-testid={`bar-${day.date}`}
                    data-count={day.count}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${day.label}: ${day.count} tickets`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(idx)}
                    onBlur={() => setHoveredIndex(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer focus:outline-none"
                  >
                    {/* Floating Tooltip popover displayed on hover or keyboard focus */}
                    {isHovered && (
                      <div
                        data-testid="chart-tooltip"
                        className="absolute bottom-[calc(100%+8px)] z-40 pointer-events-none transform -translate-x-1/2 left-1/2 transition-opacity duration-150"
                      >
                        <div className="bg-slate-900/95 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-xs min-w-[140px] text-center">
                          <div className="text-[11px] text-slate-400 font-medium">
                            {day.dayOfWeek}, {day.label}
                            {isToday && " (Today)"}
                          </div>
                          <div className="text-sm font-extrabold text-blue-300 mt-0.5">
                            {day.count} {day.count === 1 ? "ticket" : "tickets"}
                          </div>

                          {day.count > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] space-y-0.5 text-left font-medium">
                              {day.open > 0 && (
                                <div className="flex justify-between items-center text-blue-400">
                                  <span>Open</span>
                                  <span className="font-bold">{day.open}</span>
                                </div>
                              )}
                              {day.in_progress > 0 && (
                                <div className="flex justify-between items-center text-amber-400">
                                  <span>In Progress</span>
                                  <span className="font-bold">{day.in_progress}</span>
                                </div>
                              )}
                              {day.resolved > 0 && (
                                <div className="flex justify-between items-center text-emerald-400">
                                  <span>Resolved</span>
                                  <span className="font-bold">{day.resolved}</span>
                                </div>
                              )}
                              {day.ai_resolved > 0 && (
                                <div className="flex justify-between items-center text-purple-400">
                                  <span>AI Auto-Resolved</span>
                                  <span className="font-bold">{day.ai_resolved}</span>
                                </div>
                              )}
                              {day.closed > 0 && (
                                <div className="flex justify-between items-center text-slate-400">
                                  <span>Closed</span>
                                  <span className="font-bold">{day.closed}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Downward tooltip arrow */}
                        <div className="w-2 h-2 bg-slate-900 rotate-45 transform -translate-x-1/2 left-1/2 -mt-1 mx-auto border-r border-b border-slate-700/60" />
                      </div>
                    )}

                    {/* The Bar Element */}
                    {day.count > 0 ? (
                      <div
                        style={{ height: `${Math.max(heightPercent, 8)}%` }}
                        className={`w-full max-w-[24px] rounded-t-sm transition-all duration-150 ${
                          isPeak
                            ? "bg-gradient-to-t from-blue-700 to-indigo-600 shadow-sm"
                            : "bg-gradient-to-t from-blue-600 to-indigo-500"
                        } ${
                          isHovered
                            ? "from-blue-500 to-indigo-400 ring-2 ring-blue-400 ring-offset-1 scale-y-102 origin-bottom brightness-110"
                            : "group-hover:from-blue-500 group-hover:to-indigo-400"
                        }`}
                      />
                    ) : (
                      /* Zero-count baseline indicator so day is visible */
                      <div
                        style={{ height: "4px" }}
                        className={`w-full max-w-[24px] rounded-full transition-colors ${
                          isHovered ? "bg-slate-400 ring-2 ring-slate-300" : "bg-slate-200/80 group-hover:bg-slate-300"
                        }`}
                      />
                    )}

                    {/* Today indicator dot */}
                    {isToday && (
                      <span className="absolute -bottom-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" title="Today" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X-Axis Date Labels Row */}
        <div className="flex mt-3 pl-9 sm:pl-11 pr-1 text-[10px] sm:text-[11px] font-semibold text-slate-400 justify-between select-none">
          {days.map((day, idx) => {
            // Display date label on day 0, every 5th day, and the final day (today)
            const shouldShowLabel = idx === 0 || idx % 5 === 0 || idx === days.length - 1;
            if (!shouldShowLabel) {
              return <div key={day.date} className="flex-1" />;
            }
            const isToday = idx === days.length - 1;
            return (
              <div key={day.date} className="flex-1 text-center font-medium">
                <span className={isToday ? "text-blue-600 font-bold" : ""}>
                  {day.label}
                  {isToday ? " (Today)" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer with interactive details / legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-t from-blue-600 to-indigo-500 inline-block" />
            <span className="text-slate-600 font-medium">Daily Ticket Count</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span className="text-slate-600 font-medium">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-full bg-slate-300 inline-block" />
            <span className="text-slate-400">Zero Inbound</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>Hover over any bar to view daily breakdown and counts</span>
        </div>
      </div>
    </div>
  );
}

