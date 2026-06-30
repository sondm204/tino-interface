import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

export function RadioItem({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable className="flex-row items-center gap-3 py-2" onPress={onPress}>
      <View className="size-5 items-center justify-center rounded-full border border-blue-600">
        {selected ? <View className="size-3 rounded-full bg-blue-600" /> : null}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}
