import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlyIn } from "@/components/ui/fly-in";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { Text } from "@/components/ui/text";

type DialogProps = {
  action?: React.ReactNode;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
};

export function Dialog({ action, children, onOpenChange, open, title }: DialogProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const isExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const keyboardInset =
    Platform.OS === "android" && !isExpoGo ? keyboardHeight : 0;
  const { height } = useWindowDimensions();
  const maxDialogHeight = Math.max(
    280,
    height - keyboardInset - Math.max(insets.top + 16, 40) - 24
  );

  return (
    <Modal animationType="none" onRequestClose={() => onOpenChange(false)} transparent visible={open}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => onOpenChange(false)}>
          <FlyIn distance={48} key={open ? "open" : "closed"}>
            <Pressable
              className="rounded-t-3xl bg-white p-5 dark:bg-slate-900"
              onPress={(event) => event.stopPropagation()}
              style={{
                marginBottom: keyboardInset,
                paddingBottom: Math.max(insets.bottom + 20, 32),
              }}
            >
              {title || action ? (
                <View
                  className="mb-4 flex-row items-center justify-between gap-3"
                >
                  {title ? <Text className="flex-1" variant="title">{title}</Text> : null}
                  {action}
                </View>
              ) : null}
              <ScrollView
                contentContainerClassName="gap-3"
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: Math.min(height * 0.75, maxDialogHeight) }}
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
