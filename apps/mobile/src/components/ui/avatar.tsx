import { Image, View } from "react-native";
import { Text } from "@/components/ui/text";

export function Avatar({
  initials,
  size = 88,
  uri,
}: {
  initials: string;
  size?: number;
  uri?: string | null;
}) {
  if (uri) {
    return <Image source={{ uri }} style={{ borderRadius: size / 2, height: size, width: size }} />;
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-blue-600"
      style={{ height: size, width: size }}
    >
      <Text className="text-lg font-bold text-white">{initials}</Text>
    </View>
  );
}
