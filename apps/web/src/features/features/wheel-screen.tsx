"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Wheel, WheelItem } from "spin-wheel";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { TextField } from "@/src/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WheelOption = {
  id: string;
  label: string;
};

type WheelWinner = {
  id: string;
  label: string;
};

const initialWheelOptions: WheelOption[] = [
  { id: "1", label: "Ăn lẩu" },
  { id: "2", label: "Đi cà phê" },
  { id: "3", label: "Xem phim" },
  { id: "4", label: "Ở nhà" },
];

const wheelColors = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

function createWheelOption(index: number): WheelOption {
  return {
    id: `${Date.now()}-${index}`,
    label: "",
  };
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sampleCurve = (a: number, b: number, progress: number) =>
    3 * a * (1 - progress) ** 2 * progress +
    3 * b * (1 - progress) * progress ** 2 +
    progress ** 3;

  const sampleCurveDerivative = (a: number, b: number, progress: number) =>
    3 * a * (1 - progress) ** 2 +
    6 * (b - a) * (1 - progress) * progress +
    3 * (1 - b) * progress ** 2;

  return (progress: number) => {
    let estimate = progress;

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const xEstimate = sampleCurve(x1, x2, estimate) - progress;
      const derivative = sampleCurveDerivative(x1, x2, estimate);

      if (Math.abs(derivative) < 0.001) {
        break;
      }

      estimate -= xEstimate / derivative;
    }

    return sampleCurve(y1, y2, Math.min(Math.max(estimate, 0), 1));
  };
}

const wheelSpinEasing = cubicBezier(0.12, 0, 0.08, 1);

export function WheelScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const pendingWinnerRef = useRef<number | null>(null);
  const [options, setOptions] = useState<WheelOption[]>(initialWheelOptions);
  const [winner, setWinner] = useState<WheelWinner | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const activeWheelOptions = useMemo<WheelWinner[]>(
    () =>
      options
        .map((option) => ({ id: option.id, label: option.label.trim() }))
        .filter((option) => option.label),
    [options]
  );
  const wheelItems = useMemo<WheelItem[]>(
    () =>
      activeWheelOptions.map((option, index) => ({
        backgroundColor: wheelColors[index % wheelColors.length],
        label: option.label,
        labelColor: "#ffffff",
        value: option.id,
        weight: 1,
      })),
    [activeWheelOptions]
  );
  const canSpin = wheelItems.length >= 2 && !spinning;

  useEffect(() => {
    let cancelled = false;

    async function setupWheel() {
      if (!containerRef.current) {
        return;
      }

      const { Wheel: SpinWheel } = await import("spin-wheel");

      if (cancelled || !containerRef.current) {
        return;
      }

      if (!wheelRef.current) {
        wheelRef.current = new SpinWheel(containerRef.current, {
          borderColor: "#0f172a",
          borderWidth: 2,
          isInteractive: false,
          itemLabelAlign: "right",
          itemLabelFont: "Inter, Arial, sans-serif",
          itemLabelFontSizeMax: 28,
          itemLabelRadius: 0.86,
          itemLabelRadiusMax: 0.24,
          items: wheelItems,
          lineColor: "rgba(255,255,255,0.7)",
          lineWidth: 2,
          pointerAngle: 0,
          radius: 0.92,
        }) as Wheel;
      } else {
        wheelRef.current.items = wheelItems;
      }

      wheelRef.current.onRest = (event) => {
        const winnerIndex = pendingWinnerRef.current ?? event.currentIndex;
        const selected = activeWheelOptions[winnerIndex] ?? null;

        pendingWinnerRef.current = null;
        setWinner(selected);
        setResultOpen(Boolean(selected));
        setSpinning(false);
      };
    }

    void setupWheel();

    return () => {
      cancelled = true;
    };
  }, [activeWheelOptions, wheelItems]);

  useEffect(
    () => () => {
      wheelRef.current?.remove();
      wheelRef.current = null;
    },
    []
  );

  function updateOption(id: string, label: string) {
    setOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, label } : option))
    );
  }

  function addOption() {
    setOptions((current) => [...current, createWheelOption(current.length + 1)]);
  }

  function resetOptions() {
    setOptions([createWheelOption(1)]);
    setWinner(null);
    setResultOpen(false);
  }

  function duplicateOptions() {
    setOptions((current) => [
      ...current,
      ...current.map((option, index) => ({
        id: `${Date.now()}-${current.length + index + 1}`,
        label: option.label,
      })),
    ]);
  }

  function removeOption(id: string) {
    setOptions((current) => current.filter((option) => option.id !== id));
  }

  function removeWinner() {
    if (!winner) {
      return;
    }

    removeOption(winner.id);
    setResultOpen(false);
    setWinner(null);
  }

  function spinWheel() {
    if (!canSpin || !wheelRef.current) {
      return;
    }

    const winnerIndex = Math.floor(Math.random() * wheelItems.length);
    pendingWinnerRef.current = winnerIndex;
    setWinner(null);
    setResultOpen(false);
    setSpinning(true);
    const duration = 3800 + Math.random() * 2400;
    const revolutions = 4 + Math.floor(Math.random() * 5);
    wheelRef.current.spinToItem(
      winnerIndex,
      duration,
      false,
      revolutions,
      1,
      wheelSpinEasing
    );
  }

  return (
    <AppShell subtitle="Chức năng thêm" title="Vòng quay lựa chọn">
      <div className="mb-4">
        <Button
          nativeButton={false}
          render={<Link href="/features" />}
          type="button"
          variant="outline"
        >
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            description="Nhập các lựa chọn, sau đó nhấn vào vòng quay để chọn ngẫu nhiên."
            title="Vòng quay"
          />
          <CardBody>
            <div
              aria-disabled={!canSpin}
              aria-label="Quay vòng lựa chọn"
              className={`relative mx-auto aspect-square w-full max-w-[520px] rounded-full outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50 ${
                canSpin
                  ? "cursor-pointer hover:scale-[1.01]"
                  : "cursor-not-allowed opacity-70"
              }`}
              onClick={spinWheel}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  spinWheel();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div
                aria-hidden
                className="absolute left-1/2 top-1 z-10 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[24px] border-x-transparent border-t-zinc-950 drop-shadow dark:border-t-white"
              />
              <div
                className="size-full rounded-full bg-zinc-100 dark:bg-zinc-900"
                ref={containerRef}
              />
            </div>
            <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {spinning
                ? "Đang quay..."
                : canSpin
                  ? "Nhấn vào vòng quay để chọn ngẫu nhiên."
                  : "Cần ít nhất hai lựa chọn để quay."}
            </p>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    onClick={resetOptions}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcw size={15} />
                    Reset
                  </Button>
                  <Button
                    onClick={duplicateOptions}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Copy size={15} />
                    Nhân đôi
                  </Button>
                  <Button
                    onClick={addOption}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                  <Plus size={15} />
                  Thêm
                  </Button>
                </div>
              }
              description="Cần ít nhất hai lựa chọn để quay."
              title="Lựa chọn"
            />
            <CardBody className="space-y-3">
              {options.map((option, index) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_40px] gap-2"
                  key={option.id}
                >
                  <TextField
                    label={`Option ${index + 1}`}
                    onChange={(event) => updateOption(option.id, event.target.value)}
                    placeholder="Nhập lựa chọn"
                    value={option.label}
                  />
                  <Button
                    aria-label="Xóa lựa chọn"
                    className="mt-6"
                    disabled={options.length <= 1}
                    onClick={() => removeOption(option.id)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Kết quả
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {winner?.label || "Chưa quay"}
            </p>
          </Card>
        </div>

        <Dialog onOpenChange={setResultOpen} open={resultOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kết quả vòng quay</DialogTitle>
              <DialogDescription>
                Vòng quay đã chọn một lựa chọn ngẫu nhiên.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Kết quả</p>
              <p className="mt-2 text-2xl font-semibold">{winner?.label}</p>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Đóng
              </DialogClose>
              <Button onClick={removeWinner} type="button" variant="destructive">
                <Trash2 size={16} />
                Xóa lựa chọn này
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
