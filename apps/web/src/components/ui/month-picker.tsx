"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/src/lib/cn";

const monthLabels = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

export function MonthPicker({
  ariaLabel = "Chọn tháng",
  className,
  onValueChange,
  value,
  variant = "tile",
}: {
  ariaLabel?: string;
  className?: string;
  onValueChange: (value: string) => void;
  value: string;
  variant?: "tile" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [selectedYear, selectedMonth] = value.split("-");
  const [pickerYear, setPickerYear] = useState(Number(selectedYear));

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setPickerYear(Number(selectedYear));
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          <button
            aria-label={ariaLabel}
            className={cn(
              variant === "tile"
                ? "flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-center hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                : "flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900",
              className
            )}
            type="button"
          />
        }
      >
        {variant === "tile" ? (
          <>
            <span className="text-2xl font-bold leading-7">
              {selectedMonth}
            </span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {selectedYear}
            </span>
          </>
        ) : (
          <>
            <CalendarDays size={16} />
            <span>{selectedMonth}/{selectedYear}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="flex items-center justify-between">
          <button
            aria-label="Năm trước"
            className="flex size-8 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setPickerYear((year) => year - 1)}
            type="button"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold">{pickerYear}</p>
          <button
            aria-label="Năm sau"
            className="flex size-8 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setPickerYear((year) => year + 1)}
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {monthLabels.map((monthLabel) => {
            const nextValue = `${pickerYear}-${monthLabel}`;
            const selected = nextValue === value;

            return (
              <button
                className={cn(
                  "rounded-md border px-2 py-2 text-center text-sm font-semibold",
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                )}
                key={monthLabel}
                onClick={() => {
                  onValueChange(nextValue);
                  setOpen(false);
                }}
                type="button"
              >
                {monthLabel}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
