import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

type DialogProps = {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
};

export function Dialog({ children, onOpenChange, open, title }: DialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={() => onOpenChange(false)} transparent visible={open}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={() => onOpenChange(false)}>
        <Pressable className="rounded-t-3xl bg-white p-5" onPress={(event) => event.stopPropagation()}>
          {title ? <Text className="mb-4" variant="title">{title}</Text> : null}
          <View className="gap-3">{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
