import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import { formatCurrency } from "@/lib/format";
import { walletTypeLabel } from "@/lib/labels";
import {
  useCreateWalletMutation,
  useGetWalletsQuery,
} from "@/store/tino-api-slice";

export function WalletsScreen() {
  const { alert } = useAlertDialog();
  const { data, isFetching, isLoading, refetch } = useGetWalletsQuery({
    page: 1,
    size: 50,
  });
  const [createWallet, createState] = useCreateWalletMutation();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"personal" | "shared">("personal");

  async function handleCreateWallet() {
    if (!name.trim()) {
      alert("Thiếu thông tin", "Vui lòng nhập tên ví.");
      return;
    }

    const result = await createWallet({
      currency: "VND",
      description: description.trim() || null,
      name: name.trim(),
      type,
    });

    if ("error" in result) {
      alert("Không thể tạo ví", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setDialogVisible(false);
    setName("");
    setDescription("");
    setType("personal");
    alert("Thành công", "Đã tạo ví mới.");
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <Screen scroll={false}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="headline">Ví chi tiêu</Text>
            <Text variant="muted">Theo dõi chi tiêu cá nhân và nhóm.</Text>
          </View>
          <Button className="rounded-full px-3" onPress={() => setDialogVisible(true)}>
            <Plus color="#fff" size={18} />
          </Button>
        </View>

        <FlatList
          contentContainerClassName="gap-3 pb-24"
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có ví nào"
              description="Tạo ví đầu tiên để bắt đầu ghi lại chi tiêu."
            />
          }
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/wallets/${item.id}`)}>
              <Card className="gap-2">
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text variant="title">{item.name}</Text>
                    <Text variant="muted">
                      {walletTypeLabel(item.type)} · {item.currency}
                    </Text>
                  </View>
                  <Text className="font-semibold">
                    {formatCurrency(item.total_amount, item.currency)}
                  </Text>
                </View>
                {item.description ? <Text variant="muted">{item.description}</Text> : null}
              </Card>
            </Pressable>
          )}
        />
      </Screen>

      <Dialog open={dialogVisible} onOpenChange={setDialogVisible} title="Tạo ví mới">
        <Input onChangeText={setName} placeholder="Tên ví" value={name} />
        <Input multiline onChangeText={setDescription} placeholder="Mô tả" value={description} />
        <View>
          <RadioItem label="Cá nhân" onPress={() => setType("personal")} selected={type === "personal"} />
          <RadioItem label="Nhóm" onPress={() => setType("shared")} selected={type === "shared"} />
        </View>
        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setDialogVisible(false)} variant="ghost">
            Hủy
          </Button>
          <Button loading={createState.isLoading} onPress={handleCreateWallet}>
            Tạo ví
          </Button>
        </View>
      </Dialog>
    </>
  );
}
