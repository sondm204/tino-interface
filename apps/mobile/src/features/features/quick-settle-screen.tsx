import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { ArrowLeft, ArrowRight, Calculator, Plus, Trash2 } from "lucide-react-native";
import { calculateQuickSettlement } from "@tino/shared/quick-settle";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatMoneyInput, parseMoneyInput } from "@/lib/format";

type QuickRow = {
  id: string;
  name: string;
  paid: string;
};

const initialRows: QuickRow[] = [
  { id: "1", name: "A", paid: "50,000" },
  { id: "2", name: "B", paid: "10,000" },
  { id: "3", name: "C", paid: "0" },
];

function createRow(index: number): QuickRow {
  return {
    id: `${Date.now()}-${index}`,
    name: "",
    paid: "",
  };
}

export function QuickSettleScreen() {
  const [rows, setRows] = useState<QuickRow[]>(initialRows);
  const [resultOpen, setResultOpen] = useState(false);
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

  function addRow() {
    setRows((current) => [...current, createRow(current.length + 1)]);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <Screen>
      <View className="gap-3">
        <Button
          className="self-start px-3"
          onPress={() => router.push("/features")}
          variant="outline"
        >
          <ArrowLeft color="#0f172a" size={17} />
          Quay lại
        </Button>
        <View className="gap-1">
          <Text variant="headline">Chia chi tiêu nhanh</Text>
          <Text variant="muted">
            Nhập số tiền mỗi người đã trả, Tino sẽ chia đều và gợi ý chuyển bù.
          </Text>
        </View>
      </View>

      <Card className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="title">Danh sách người tham gia</Text>
            <Text variant="muted">Thêm người và số tiền đã trả.</Text>
          </View>
          <Button className="px-3" onPress={addRow} variant="outline">
            <Plus color="#2563eb" size={17} />
          </Button>
        </View>

        <View className="gap-3">
          {rows.map((row, index) => (
            <View
              className="gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              key={row.id}
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text variant="label">Người {index + 1}</Text>
                <Pressable
                  className="size-9 items-center justify-center rounded-full bg-slate-100 disabled:opacity-40 dark:bg-slate-800"
                  disabled={rows.length <= 2}
                  onPress={() => removeRow(row.id)}
                >
                  <Trash2 color="#64748b" size={16} />
                </Pressable>
              </View>
              <View className="gap-2">
                <Input
                  onChangeText={(value) => updateRow(row.id, { name: value })}
                  placeholder="Tên"
                  value={row.name}
                />
                <Input
                  keyboardType="numeric"
                  onChangeText={(value) =>
                    updateRow(row.id, { paid: formatMoneyInput(value) })
                  }
                  placeholder="0"
                  value={row.paid}
                />
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row gap-2">
          <Button className="flex-1" onPress={addRow}>
            <Plus color="#fff" size={17} />
            Thêm dòng
          </Button>
          <Button
            className="flex-1"
            onPress={() => setResultOpen(true)}
            variant="outline"
          >
            <Calculator color="#0f172a" size={17} />
            Tính toán
          </Button>
        </View>
      </Card>

      <Dialog
        onOpenChange={setResultOpen}
        open={resultOpen}
        title="Kết quả chia tiền"
      >
        <View className="flex-row gap-3">
          <Card className="min-w-0 flex-1 gap-1">
            <Text variant="muted">Tổng chi</Text>
            <Text variant="title">{formatCurrency(settlement.total)}</Text>
          </Card>
          <Card className="min-w-0 flex-1 gap-1">
            <Text variant="muted">Mỗi người</Text>
            <Text variant="title">{formatCurrency(settlement.share)}</Text>
          </Card>
        </View>

        <Card className="gap-3">
          <Text variant="title">Gợi ý chuyển tiền</Text>
          {settlement.transfers.length ? (
            settlement.transfers.map((transfer) => (
              <View
                className="flex-row items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                key={`${transfer.from_id}-${transfer.to_id}-${transfer.amount}`}
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <Text className="shrink" numberOfLines={1}>
                    {transfer.from_name}
                  </Text>
                  <ArrowRight color="#64748b" size={15} />
                  <Text className="shrink" numberOfLines={1}>
                    {transfer.to_name}
                  </Text>
                </View>
                <Text className="font-semibold text-amber-700 dark:text-amber-300">
                  {formatCurrency(transfer.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="muted">Chưa cần chuyển tiền.</Text>
          )}
        </Card>
      </Dialog>
    </Screen>
  );
}
