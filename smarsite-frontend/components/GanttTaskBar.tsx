"use client";

import * as React from "react";
import type { TaskStatus } from "@/lib/types";
import { progressToColor, statusToColor } from "@/lib/ganttUtils";

export interface GanttTaskBarProps {
  taskId: string;
  /** X position in pixels. */
  x: number;
  /** Y position in pixels (top of row). */
  y: number;
  /** Width of the bar in pixels. */
  width: number;
  /** Total row height (used to vertically centre the bar). */
  rowHeight: number;
  /** Height of the visible bar in pixels. */
  barHeight: number;
  /** Primary fill color for the bar. */
  color: string;
  /** Whether this task is part of the critical path. */
  isCritical?: boolean;
  /** Whether this task is visually highlighted (e.g. dependency hover). */
  isHighlighted?: boolean;
  /** Whether this task has at least one dependency. */
  hasDependencies?: boolean;
  /** Current start date of the task. */
  startDate: Date;
  /** Current end date of the task. */
  endDate: Date;
  /** Completion percentage (0-100). */
  progress: number;
  /** Current status for badge rendering. */
  status: TaskStatus;
  /** Pixels representing one calendar day on the X axis. */
  pixelsPerDay: number;
  /** Minimum allowed start date (e.g. max of dependencies end dates). */
  minStartDate?: Date;
  /** Callback fired when the user finishes a drag with the new dates. */
  onChangeDates?: (taskId: string, nextStart: Date, nextEnd: Date) => void;
  /** Optional hover handler for tooltips. */
  onHover?: (event: React.MouseEvent<SVGRectElement>, taskId: string) => void;
  onLeave?: () => void;
}

/**
 * Draggable Gantt bar. It allows horizontal drag to shift start/end dates.
 * Snap and validation are delegated through pixelsPerDay and minStartDate.
 */
export function GanttTaskBar(props: GanttTaskBarProps) {
  const {
    taskId,
    x,
    y,
    width,
    rowHeight,
    barHeight,
    color,
    isCritical,
    isHighlighted,
    hasDependencies,
    startDate,
    endDate,
    progress,
    status,
    pixelsPerDay,
    minStartDate,
    onChangeDates,
    onHover,
    onLeave,
  } = props;

  const [dragging, setDragging] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const dragStartX = React.useRef<number | null>(null);
  const baseX = React.useRef<number>(x);
  const [offsetX, setOffsetX] = React.useState(0);

  // Keep internal base synchronized with external x when not dragging.
  React.useEffect(() => {
    if (!dragging) {
      baseX.current = x;
      setOffsetX(0);
    }
  }, [x, dragging]);

  const handleMouseDown = (event: React.MouseEvent<SVGRectElement>) => {
    event.preventDefault();
    dragStartX.current = event.clientX;
    baseX.current = x + offsetX;
    setDragging(true);
  };

  React.useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: MouseEvent) => {
      if (dragStartX.current == null) return;
      const deltaPx = event.clientX - dragStartX.current;
      setOffsetX(deltaPx);
    };

    const handleUp = () => {
      if (dragStartX.current != null && pixelsPerDay > 0) {
        const totalDeltaPx = baseX.current + offsetX - x;
        const deltaDays = Math.round(totalDeltaPx / pixelsPerDay);

        if (deltaDays !== 0 && onChangeDates) {
          const nextStart = new Date(startDate.getTime());
          nextStart.setDate(nextStart.getDate() + deltaDays);

          if (minStartDate && nextStart < minStartDate) {
            nextStart.setTime(minStartDate.getTime());
          }

          const durationDays = Math.max(
            1,
            Math.round(
              (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
            ) || 1,
          );
          const nextEnd = new Date(nextStart.getTime());
          nextEnd.setDate(nextEnd.getDate() + durationDays);

          onChangeDates(taskId, nextStart, nextEnd);
        }
      }

      setDragging(false);
      dragStartX.current = null;
      setOffsetX(0);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, offsetX, pixelsPerDay, onChangeDates, taskId, startDate, endDate, minStartDate, x]);

  const visualX = x + offsetX;
  const visualY = y + (rowHeight - barHeight) / 2;

  const baseFill = isCritical ? "#b91c1c" : color;
  const gradientId = `gantt-bar-gradient-${taskId}`;
  const shadowId = `gantt-bar-shadow-${taskId}`;

  const clampedProgress = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const progressFill = progressToColor(clampedProgress);

  const strokeWidth = isCritical || isHighlighted || hovered ? 2 : 1;
  const strokeColor = isCritical
    ? "color-mix(in oklab, var(--destructive) 85%, black)"
    : hasDependencies
      ? "color-mix(in oklab, var(--foreground) 35%, transparent)"
      : "color-mix(in oklab, var(--foreground) 22%, transparent)";

  const statusColor = statusToColor(status);

  const handleMouseEnter = (event: React.MouseEvent<SVGRectElement>) => {
    setHovered(true);
    onHover?.(event, taskId);
  };

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    onHover?.(event, taskId);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    onLeave?.();
  };

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={baseFill} stopOpacity={0.9} />
          <stop offset="100%" stopColor={baseFill} stopOpacity={1} />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow
            dx="0"
            dy={hovered || isHighlighted ? "1.5" : "1"}
            stdDeviation={hovered || isHighlighted ? "2" : "1"}
            floodColor="color-mix(in oklab, var(--foreground) 28%, transparent)"
          />
        </filter>
      </defs>

      {/* Main bar background */}
      <rect
        x={visualX}
        y={visualY}
        width={width}
        height={barHeight}
        rx={8}
        ry={8}
        fill={`url(#${gradientId})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        cursor={dragging ? "grabbing" : "grab"}
        filter={`url(#${shadowId})`}
        style={{ transition: "all 150ms ease-in-out" }}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Inner progress bar */}
      {width > 8 && (
        <rect
          x={visualX + 1}
          y={visualY + barHeight / 2 - (barHeight * 0.35) / 2}
          width={(Math.max(4, width - 2) * clampedProgress) / 100}
          height={barHeight * 0.36}
          rx={5}
          ry={5}
          fill={progressFill}
          opacity={0.95}
          style={{ transition: "all 150ms ease-in-out" }}
        />
      )}

      {/* Progress text */}
      {width > 32 && (
        <text
          x={visualX + width / 2}
          y={visualY + barHeight / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={clampedProgress > 52 ? "#fafafa" : "var(--foreground)"}
          fontSize={11}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          {`${Math.round(clampedProgress)}%`}
        </text>
      )}

      {/* Status badge in top-right corner of the bar */}
      {width > 48 && (
        <g>
          <rect
            x={visualX + width - 44}
            y={visualY - 10}
            width={42}
            height={15}
            rx={8}
            ry={8}
            fill={statusColor}
            opacity={0.92}
          />
          <text
            x={visualX + width - 23}
            y={visualY + 1.25}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fafafa"
            fontSize={9}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {status === "Terminé"
              ? "Done"
              : status === "En cours"
                ? "Active"
                : "To do"}
          </text>
        </g>
      )}
    </g>
  );
}

export default GanttTaskBar;
