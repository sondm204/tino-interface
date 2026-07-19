import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ArrowLeft, Camera, CreditCard, QrCode, Save, Trash2 } from "lucide-react-native";
import { VIETQR_BANKS } from "@tino/shared/banks";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { setStoredCurrentUser } from "@/lib/api-client";
import { setCurrentUser } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  useChangePasswordMutation,
  useCreateBankAccountMutation,
  useDecodeBankAccountQrImageMutation,
  useDeleteBankAccountMutation,
  useGetBankAccountsQuery,
  useUpdateProfileMutation,
  useUploadBankAccountQrImageMutation,
  useUploadAvatarMutation,
} from "@/store/tino-api-slice";

function maskAccountNumber(accountNumber: string) {
  const suffix = accountNumber.slice(-4);

  return suffix ? `•••• ${suffix}` : "••••";
}

export function ProfileScreen() {
  const { alert } = useAlertDialog();
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [uploadAvatar, uploadState] = useUploadAvatarMutation();
  const bankAccountsQuery = useGetBankAccountsQuery(undefined, {
    skip: !currentUser,
  });
  const [createBankAccount, createBankAccountState] =
    useCreateBankAccountMutation();
  const [uploadBankAccountQrImage, bankQrState] =
    useUploadBankAccountQrImageMutation();
  const [decodeBankAccountQrImage, bankQrDecodeState] =
    useDecodeBankAccountQrImageMutation();
  const [deleteBankAccount, deleteBankAccountState] =
    useDeleteBankAccountMutation();
  const [displayName, setDisplayName] = useState(currentUser?.display_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const defaultBankAccount = bankAccountsQuery.data?.[0] ?? null;
  const [bankName, setBankName] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [bankDialogVisible, setBankDialogVisible] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [selectedBankQrFile, setSelectedBankQrFile] = useState<{
    name: string;
    type: string;
    uri: string;
  } | null>(null);

  useEffect(() => {
    setDisplayName(currentUser?.display_name || "");
  }, [currentUser?.display_name]);

  async function handleUpdateProfile() {
    if (!displayName.trim()) {
      alert("Thiếu thông tin", "Tên hiển thị không được để trống.");
      return;
    }

    const result = await updateProfile({ display_name: displayName.trim() });
    if ("error" in result) {
      alert("Không thể cập nhật", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    await setStoredCurrentUser(result.data);
    dispatch(setCurrentUser(result.data));
    alert("Thành công", "Đã cập nhật hồ sơ.");
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      alert("Thiếu thông tin", "Vui lòng nhập đầy đủ mật khẩu.");
      return;
    }

    const result = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    if ("error" in result) {
      alert("Không thể đổi mật khẩu", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    alert("Thành công", "Đã đổi mật khẩu.");
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Cần cấp quyền", "Bạn cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uploadResult = await uploadAvatar({
      name: asset.fileName || `avatar-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
      uri: asset.uri,
    });
    if ("error" in uploadResult) {
      alert("Không thể upload ảnh", uploadResult.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    await setStoredCurrentUser(uploadResult.data.user);
    dispatch(setCurrentUser(uploadResult.data.user));
    alert("Thành công", "Đã cập nhật ảnh đại diện.");
  }

  async function handleSaveBankAccount() {
    const payload = {
      bank_name: bankName.trim(),
      bank_bin: bankBin.trim(),
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
      is_default: true,
    };
    if (defaultBankAccount) {
      alert("Vui lòng xoá tài khoản hiện tại trước khi thêm tài khoản mới.");
      return;
    }

    const result = await createBankAccount(payload);

    if ("error" in result) {
      alert("Không thể lưu tài khoản", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    if (selectedBankQrFile) {
      const uploadResult = await uploadBankAccountQrImage({
        bankAccountId: result.data.id,
        file: selectedBankQrFile,
      });

      if ("error" in uploadResult) {
        alert("Đã lưu tài khoản", uploadResult.error?.message || "Không thể lưu ảnh QR.");
        return;
      }

      setSelectedBankQrFile(null);
    }

    alert("Thành công", "Đã lưu tài khoản nhận tiền.");
  }

  async function handlePickBankQrForPrefill() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Cần cấp quyền", "Bạn cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const qrFile = {
      name: asset.fileName || `bank-qr-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
      uri: asset.uri,
    };
    const decodeResult = await decodeBankAccountQrImage(qrFile);

    if ("error" in decodeResult) {
      alert("Không thể đọc QR", decodeResult.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    const bank = VIETQR_BANKS.find((item) => item.bin === decodeResult.data.bank_bin);
    setBankName(bank?.name || "");
    setBankBin(decodeResult.data.bank_bin);
    setAccountNumber(decodeResult.data.account_number);

    if (decodeResult.data.account_name) {
      setAccountName(decodeResult.data.account_name);
    }
    setSelectedBankQrFile(qrFile);

    alert(
      "Đã tự điền",
      decodeResult.data.account_name
        ? "Đã lấy thông tin tài khoản từ ảnh QR."
        : "Đã lấy ngân hàng và số tài khoản. Vui lòng nhập thêm tên chủ tài khoản."
    );
  }

  function handleDeleteBankAccount() {
    if (!defaultBankAccount) {
      return;
    }

    Alert.alert("Xoá tài khoản nhận tiền?", "Tài khoản này sẽ không còn dùng để tạo QR tất toán.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          const result = await deleteBankAccount(defaultBankAccount.id);

          if ("error" in result) {
            alert("Không thể xoá", result.error?.message || "Đã có lỗi xảy ra.");
            return;
          }

          setBankName("");
          setBankBin("");
          setAccountNumber("");
          setAccountName("");
          setSelectedBankQrFile(null);
          alert("Thành công", "Đã xoá tài khoản nhận tiền.");
        },
      },
    ]);
  }

  const initials = (currentUser?.display_name || currentUser?.email || "TE")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <Button className="px-3" onPress={() => router.back()} variant="ghost">
          <ArrowLeft color={isDark ? "#f8fafc" : "#0f172a"} size={18} />
        </Button>
        <Text variant="headline">Hồ sơ cá nhân</Text>
      </View>

      <View className="items-center gap-2 py-4">
        <Avatar initials={initials} uri={currentUser?.avatar_url} />
        <Text variant="headline">{currentUser?.display_name || "Hồ sơ"}</Text>
        <Text variant="muted">{currentUser?.email}</Text>
      </View>

      <Card className="gap-3">
        <Text variant="title">Thông tin cá nhân</Text>
        <Input onChangeText={setDisplayName} placeholder="Tên hiển thị" value={displayName} />
        <Input
          className="border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
          editable={false}
          placeholder="Email"
          selectTextOnFocus={false}
          value={currentUser?.email || ""}
        />
        <Button loading={updateState.isLoading} onPress={handleUpdateProfile}>
          <Save color="#fff" size={16} />
          <Text className="font-semibold text-white">Lưu thay đổi</Text>
        </Button>
        <Button loading={uploadState.isLoading} onPress={handlePickAvatar} variant="outline">
          <Camera color={isDark ? "#f8fafc" : "#0f172a"} size={16} />
          <Text className="font-semibold">Đổi ảnh đại diện</Text>
        </Button>
      </Card>

      <Card className="gap-3">
        <Text variant="title">Đổi mật khẩu</Text>
        <Input
          onChangeText={setCurrentPassword}
          placeholder="Mật khẩu hiện tại"
          secureTextEntry
          value={currentPassword}
        />
        <Input
          onChangeText={setNewPassword}
          placeholder="Mật khẩu mới"
          secureTextEntry
          value={newPassword}
        />
        <Button loading={passwordState.isLoading} onPress={handleChangePassword}>
          Đổi mật khẩu
        </Button>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center gap-2">
          <CreditCard color={isDark ? "#f8fafc" : "#0f172a"} size={18} />
          <Text variant="title">Tài khoản nhận tiền</Text>
        </View>
        <Text variant="muted">
          Dùng để tạo VietQR khi thành viên khác cần tất toán cho bạn.
        </Text>
        {defaultBankAccount ? (
          <View className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
            <CreditCard color={isDark ? "#94a3b8" : "#64748b"} size={18} />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold">{defaultBankAccount.bank_name}</Text>
              <Text variant="muted">
                {maskAccountNumber(defaultBankAccount.account_number)}
              </Text>
            </View>
            <View className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-1">
              <Text className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                Mặc định
              </Text>
            </View>
            <Button
              className="px-3"
              loading={deleteBankAccountState.isLoading}
              onPress={handleDeleteBankAccount}
              variant="ghost"
            >
              <Trash2 color={isDark ? "#f8fafc" : "#0f172a"} size={16} />
            </Button>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              className="min-h-12 justify-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              onPress={() => setBankDialogVisible(true)}
            >
              <Text className={bankName ? "font-semibold" : "text-slate-400"}>
                {bankName || "Chọn ngân hàng"}
              </Text>
              {bankBin ? <Text variant="small">BIN {bankBin}</Text> : null}
            </Pressable>
            <Input
              keyboardType="numeric"
              onChangeText={setAccountNumber}
              placeholder="Số tài khoản"
              value={accountNumber}
            />
            <Input
              autoCapitalize="characters"
              onChangeText={setAccountName}
              placeholder="Tên chủ tài khoản"
              value={accountName}
            />
            <Button
              loading={bankQrDecodeState.isLoading}
              onPress={handlePickBankQrForPrefill}
              variant="outline"
            >
              <QrCode color={isDark ? "#f8fafc" : "#0f172a"} size={16} />
              Đọc QR để tự điền
            </Button>
            <Button
              loading={createBankAccountState.isLoading || bankQrState.isLoading}
              onPress={handleSaveBankAccount}
            >
              <Save color="#fff" size={16} />
              {createBankAccountState.isLoading || bankQrState.isLoading
                ? "Đang lưu..."
                : "Lưu tài khoản"}
            </Button>
          </>
        )}
      </Card>

      <Dialog
        open={bankDialogVisible}
        onOpenChange={setBankDialogVisible}
        title="Chọn ngân hàng"
      >
        <View className="gap-2">
          {VIETQR_BANKS.map((bank) => (
            <Pressable
              accessibilityRole="button"
              className={`rounded-xl border px-3 py-3 ${
                bankBin === bank.bin
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
              key={bank.bin}
              onPress={() => {
                setBankName(bank.name);
                setBankBin(bank.bin);
                setBankDialogVisible(false);
              }}
            >
              <Text className="font-semibold">{bank.name}</Text>
              <Text variant="small">BIN {bank.bin}</Text>
            </Pressable>
          ))}
        </View>
      </Dialog>
    </Screen>
  );
}
