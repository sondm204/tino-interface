"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateQuickSettlement } from "@tino/shared/quick-settle";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { TextField } from "@/src/components/ui/field";
import { Badge } from "@/src/components/ui/status";
import { formatCurrency, formatMoneyInput, parseMoneyInput } from "@/src/lib/format";

type QuickRow = {
  id: string;
  name: string;
  paid: string;
};

const exampleRows: QuickRow[] = [
  { id: "1", name: "A", paid: "50,000" },
  { id: "2", name: "B", paid: "100,000" },
  { id: "3", name: "C", paid: "0" },
];

const emptyRows: QuickRow[] = [{ id: "1", name: "", paid: "" }];

function createRow(index: number): QuickRow {
  return {
    id: `${Date.now()}-${index}`,
    name: "",
    paid: "",
  };
}

export function QuickSettleScreen() {
  const [rows, setRows] = useState<QuickRow[]>(exampleRows);
  const settlement = useMemo(
    () =>
      calculateQuickSettlement(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          paid: parseMoneyInput(row.paid),
        }))
      ),
    [rows]
  );

  function updateRow(id: string, patch: Partial<QuickRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function addRow() {
    setRows((current) => [...current, createRow(current.length + 1)]);
  }

  return (
    <AppShell subtitle="Chức năng thêm" title="Chia chi tiêu nhanh">
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader
            description="Nhập số tiền mỗi người đã trả trong một cuộc chơi ngắn. Tino sẽ chia đều tổng tiền và đề xuất các lượt chuyển bù trừ."
            title="Danh sách người tham gia"
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3">
              {rows.map((row, index) => (
                <div
                  className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]"
                  key={row.id}
                >
                  <TextField
                    label={`Người ${index + 1}`}
                    onChange={(event) =>
                      updateRow(row.id, { name: event.target.value })
                    }
                    placeholder="Tên"
                    value={row.name}
                  />
                  <TextField
                    inputMode="numeric"
                    label="Đã trả"
                    onChange={(event) =>
                      updateRow(row.id, {
                        paid: formatMoneyInput(event.target.value),
                      })
                    }
                    placeholder="0"
                    value={row.paid}
                  />
                  <Button
                    aria-label="Xóa người"
                    className="mt-6"
                    disabled={rows.length <= 2}
                    onClick={() => removeRow(row.id)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={addRow} type="button">
                <Plus size={16} />
                Thêm dòng
              </Button>
              <Button
                onClick={() => setRows(emptyRows)}
                type="button"
                variant="outline"
              >
                <RotateCcw size={16} />
                Reset
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng chi
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(settlement.total)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Mỗi người chịu
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(settlement.share)}
              </p>
            </Card>
          </section>

          <Card>
            <CardHeader
              description="Các lượt chuyển được bù trừ để tránh chuyển vòng."
              title="Gợi ý chuyển tiền"
            />
            <CardBody className="space-y-3">
              {settlement.transfers.length ? (
                settlement.transfers.map((transfer) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    key={`${transfer.from_id}-${transfer.to_id}-${transfer.amount}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold">
                        {transfer.from_name}
                      </span>
                      <ArrowRight className="shrink-0 text-zinc-400" size={16} />
                      <span className="truncate font-semibold">
                        {transfer.to_name}
                      </span>
                    </div>
                    <Badge tone="amber">{formatCurrency(transfer.amount)}</Badge>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  Chưa cần chuyển tiền. Thêm ít nhất hai người và số tiền đã trả.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cân bằng từng người" />
            <CardBody className="space-y-2">
              {settlement.balances.map((balance) => (
                <div
                  className="flex items-center justify-between gap-3 text-sm"
                  key={balance.id}
                >
                  <span className="truncate font-medium">{balance.name}</span>
                  <span className="text-right text-zinc-500 dark:text-zinc-400">
                    Đã trả {formatCurrency(balance.paid)}
                    {" · "}
                    {balance.balance >= 0 ? "nhận " : "trả "}
                    {formatCurrency(Math.abs(balance.balance))}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
