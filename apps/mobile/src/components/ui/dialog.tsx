import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlyIn } from "@/components/ui/fly-in";
import { Text } from "@/components/ui/text";

type DialogProps = {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
};

export function Dialog({ children, onOpenChange, open, title }: DialogProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal animationType="none" onRequestClose={() => onOpenChange(false)} transparent visible={open}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => onOpenChange(false)}>
          <FlyIn distance={48} key={open ? "open" : "closed"}>
            <Pressable
              className="rounded-t-3xl bg-white p-5 dark:bg-slate-900"
              onPress={(event) => event.stopPropagation()}
              style={{ paddingBottom: Math.max(insets.bottom + 20, 32) }}
            >
              {title ? <Text className="mb-4" variant="title">{title}</Text> : null}
              <ScrollView
                contentContainerClassName="gap-3"
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: height * 0.75 }}
              >
                {children}
              </ScrollView>
            </Pressable>
          </FlyIn>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
