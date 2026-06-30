import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Camera, LogOut, Save } from "lucide-react-native";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { clearAuthToken, setStoredCurrentUser } from "@/lib/api-client";
import { clearCurrentUser, setCurrentUser } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  useChangePasswordMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from "@/store/tino-api-slice";

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [uploadAvatar, uploadState] = useUploadAvatarMutation();
  const [logout] = useLogoutMutation();
  const [displayName, setDisplayName] = useState(currentUser?.display_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setDisplayName(currentUser?.display_name || "");
  }, [currentUser?.display_name]);

  async function handleUpdateProfile() {
    if (!displayName.trim()) {
      Alert.alert("Thiếu thông tin", "Tên hiển thị không được để trống.");
      return;
    }

    const result = await updateProfile({ display_name: displayName.trim() });

    if ("error" in result) {
      Alert.alert("Không thể cập nhật", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    await setStoredCurrentUser(result.data);
    dispatch(setCurrentUser(result.data));
    Alert.alert("Thành công", "Đã cập nhật hồ sơ.");
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ mật khẩu.");
      return;
    }

    const result = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });

    if ("error" in result) {
      Alert.alert("Không thể đổi mật khẩu", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    Alert.alert("Thành công", "Đã đổi mật khẩu.");
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Cần cấp quyền", "Bạn cần cấp quyền truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const uploadResult = await uploadAvatar({
      name: asset.fileName || `avatar-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
      uri: asset.uri,
    });

    if ("error" in uploadResult) {
      Alert.alert("Không thể upload ảnh", uploadResult.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    await setStoredCurrentUser(uploadResult.data.user);
    dispatch(setCurrentUser(uploadResult.data.user));
    Alert.alert("Thành công", "Đã cập nhật ảnh đại diện.");
  }

  async function handleLogout() {
    await logout();
    await clearAuthToken();
    dispatch(clearCurrentUser());
    router.replace("/login");
  }

  function confirmLogout() {
    Alert.alert("Đăng xuất?", "Bạn sẽ cần đăng nhập lại để tiếp tục.", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: handleLogout },
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
      <View className="items-center gap-2 py-4">
        <Avatar initials={initials} uri={currentUser?.avatar_url} />
        <Text variant="headline">{currentUser?.display_name || "Hồ sơ"}</Text>
        <Text variant="muted">{currentUser?.email}</Text>
      </View>

      <Card className="gap-3">
        <Text variant="title">Thông tin cá nhân</Text>
        <Input onChangeText={setDisplayName} placeholder="Tên hiển thị" value={displayName} />
        <Input editable={false} placeholder="Email" value={currentUser?.email || ""} />
        <Text variant="muted">Email đăng nhập hiện chưa thể thay đổi.</Text>
        <Button loading={updateState.isLoading} onPress={handleUpdateProfile}>
          <Save color="#fff" size={16} />
          <Text className="font-semibold text-white">Lưu thay đổi</Text>
        </Button>
        <Button loading={uploadState.isLoading} onPress={handlePickAvatar} variant="outline">
          <Camera color="#0f172a" size={16} />
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

      <Button onPress={confirmLogout} variant="outline">
        <LogOut color="#dc2626" size={16} />
        <Text className="font-semibold text-red-600">Đăng xuất</Text>
      </Button>
    </Screen>
  );
}
