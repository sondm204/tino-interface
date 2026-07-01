import { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button } from "@/components/ui/button";
import { FlyIn } from "@/components/ui/fly-in";
import { Text } from "@/components/ui/text";

type AlertAction = {
  onPress?: () => void | Promise<void>;
  style?: "cancel" | "default" | "destructive";
  text: string;
};

type AlertOptions = {
  actions: AlertAction[];
  message?: string;
  title: string;
};

type AlertDialogContextValue = {
  alert: (title: string, message?: string, actions?: AlertAction[]) => void;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export function AlertDialogProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const value = useMemo<AlertDialogContextValue>(
    () => ({
      alert: (title, message, actions = [{ text: "Đóng" }]) => {
        setOptions({ actions, message, title });
      },
    }),
    []
  );

  function close() {
    setOptions(null);
  }

  function runAction(action: AlertAction) {
    close();
    void action.onPress?.();
  }

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
      <Modal
        animationType="none"
        onRequestClose={close}
        transparent
        visible={options !== null}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-5"
          onPress={close}
        >
          <FlyIn distance={18} key={options ? "open" : "closed"} style={{ width: "100%" }}>
            <Pressable
              className="w-full max-w-md gap-4 self-center rounded-2xl bg-white p-5"
              onPress={(event) => event.stopPropagation()}
            >
              <View className="gap-2">
                <Text variant="title">{options?.title}</Text>
                {options?.message ? <Text variant="muted">{options.message}</Text> : null}
              </View>
              <View className="flex-row justify-end gap-2">
                {options?.actions.map((action, index) => (
                  <Button
                    key={`${action.text}-${index}`}
                    onPress={() => runAction(action)}
                    variant={
                      action.style === "destructive"
                        ? "destructive"
                        : action.style === "cancel"
                          ? "ghost"
                          : "default"
                    }
                  >
                    {action.text}
                  </Button>
                ))}
              </View>
            </Pressable>
          </FlyIn>
        </Pressable>
      </Modal>
    </AlertDialogContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);

  if (!context) {
    throw new Error("useAlertDialog must be used inside AlertDialogProvider");
  }

  return context;
}
