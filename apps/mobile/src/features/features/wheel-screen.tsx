import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { ArrowLeft, Copy, Plus, RotateCcw, Trash2 } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

type WheelOption = {
  id: string;
  label: string;
};

type WheelWinner = {
  id: string;
  label: string;
};

const initialOptions: WheelOption[] = [
  { id: "1", label: "Ăn lẩu" },
  { id: "2", label: "Đi cà phê" },
  { id: "3", label: "Xem phim" },
  { id: "4", label: "Ở nhà" },
];

const wheelColors = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const wheelSize = 280;
const wheelCenter = wheelSize / 2;
const wheelRadius = 132;
const wheelSpinEasing = Easing.bezier(0.12, 0, 0.08, 1);

function createOption(index: number): WheelOption {
  return {
    id: `${Date.now()}-${index}`,
    label: "",
  };
}

function polarPoint(angle: number, radius = wheelRadius) {
  const radians = (Math.PI / 180) * angle;

  return {
    x: wheelCenter + Math.sin(radians) * radius,
    y: wheelCenter - Math.cos(radians) * radius,
  };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarPoint(startAngle);
  const end = polarPoint(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${wheelCenter} ${wheelCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${wheelRadius} ${wheelRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function shortLabel(label: string) {
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

export function WheelScreen() {
  const [options, setOptions] = useState<WheelOption[]>(initialOptions);
  const [winner, setWinner] = useState<WheelWinner | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const rotationValue = useSharedValue(0);
  const rotationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOptions = useMemo<WheelWinner[]>(
    () =>
      options
        .map((option) => ({ id: option.id, label: option.label.trim() }))
        .filter((option) => option.label),
    [options]
  );
  const segmentAngle = activeOptions.length ? 360 / activeOptions.length : 360;
  const canSpin = activeOptions.length >= 2 && !spinning;
  const animatedWheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }],
  }));

  function updateOption(id: string, label: string) {
    setOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, label } : option))
    );
  }

  function addOption() {
    setOptions((current) => [...current, createOption(current.length + 1)]);
  }

  function resetOptions() {
    setOptions([createOption(1)]);
    setWinner(null);
    setResultOpen(false);
  }

  function duplicateOptions() {
    setOptions((current) => [
      ...current,
      ...current.map((option, index) => ({
        id: `${Date.now()}-${current.length + index + 1}`,
        label: option.label,
      })),
    ]);
  }

  function removeOption(id: string) {
    setOptions((current) => current.filter((option) => option.id !== id));
  }

  function removeWinner() {
    if (!winner) {
      return;
    }

    removeOption(winner.id);
    setResultOpen(false);
    setWinner(null);
  }

  function spinWheel() {
    if (!canSpin) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const winnerIndex = Math.floor(Math.random() * activeOptions.length);
    const segmentStartAngle = winnerIndex * segmentAngle;
    const edgePadding = Math.min(segmentAngle * 0.14, 8);
    const randomOffset =
      edgePadding + Math.random() * Math.max(segmentAngle - edgePadding * 2, 1);
    const targetAngle = segmentStartAngle + randomOffset;
    const revolutions = 4 + Math.floor(Math.random() * 5);
    const baseRotation = Math.ceil(rotationRef.current / 360) * 360;
    let targetRotation = baseRotation + revolutions * 360 - targetAngle;

    if (targetRotation <= rotationRef.current) {
      targetRotation += 360;
    }

    const duration = 3800 + Math.random() * 2400;
    rotationRef.current = targetRotation;
    setWinner(null);
    setResultOpen(false);
    setSpinning(true);
    rotationValue.value = withTiming(targetRotation, {
      duration,
      easing: wheelSpinEasing,
    });
    timeoutRef.current = setTimeout(() => {
      setWinner(activeOptions[winnerIndex]);
      setResultOpen(true);
      setSpinning(false);
    }, duration + 120);
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
          <Text variant="headline">Vòng quay lựa chọn</Text>
          <Text variant="muted">
            Nhập các lựa chọn, sau đó nhấn vào vòng quay để chọn ngẫu nhiên.
          </Text>
        </View>
      </View>

      <Card className="items-center gap-4">
        <Pressable
          className={canSpin ? "active:opacity-90" : "opacity-60"}
          disabled={!canSpin}
          onPress={spinWheel}
        >
          <View className="relative items-center justify-center">
            <View className="absolute top-0 z-10 h-0 w-0 border-x-[13px] border-t-[24px] border-x-transparent border-t-slate-950 dark:border-t-white" />
            <Animated.View style={animatedWheelStyle}>
              <Svg height={wheelSize} width={wheelSize}>
                <G>
                  {activeOptions.length ? (
                    activeOptions.map((option, index) => {
                      const startAngle = index * segmentAngle;
                      const endAngle = (index + 1) * segmentAngle;
                      const labelAngle = startAngle + segmentAngle / 2;
                      const labelPoint = polarPoint(labelAngle, wheelRadius * 0.62);
                      const labelRotation = labelAngle + 90;

                      return (
                        <G key={option.id}>
                          <Path
                            d={describeSlice(startAngle, endAngle)}
                            fill={wheelColors[index % wheelColors.length]}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          <SvgText
                            alignmentBaseline="middle"
                            fill="#ffffff"
                            fontSize={13}
                            fontWeight="700"
                            textAnchor="middle"
                            transform={`rotate(${labelRotation} ${labelPoint.x} ${labelPoint.y})`}
                            x={labelPoint.x}
                            y={labelPoint.y}
                          >
                            {shortLabel(option.label)}
                          </SvgText>
                        </G>
                      );
                    })
                  ) : (
                    <Path
                      d={describeSlice(0, 359.99)}
                      fill="#e2e8f0"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )}
                </G>
              </Svg>
            </Animated.View>
            <View className="absolute size-12 rounded-full bg-white shadow dark:bg-slate-900" />
          </View>
        </Pressable>
        <Text className="text-center" variant="muted">
          {spinning
            ? "Đang quay..."
            : canSpin
              ? "Nhấn vào vòng quay để chọn ngẫu nhiên."
              : "Cần ít nhất hai lựa chọn để quay."}
        </Text>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="title">Lựa chọn</Text>
            <Text variant="muted">Cần ít nhất hai lựa chọn để quay.</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Button className="px-3" onPress={resetOptions} variant="outline">
              <RotateCcw color="#2563eb" size={17} />
            </Button>
            <Button className="px-3" onPress={duplicateOptions} variant="outline">
              <Copy color="#2563eb" size={17} />
            </Button>
            <Button className="px-3" onPress={addOption} variant="outline">
              <Plus color="#2563eb" size={17} />
            </Button>
          </View>
        </View>

        {options.map((option, index) => (
          <View className="flex-row items-end gap-2" key={option.id}>
            <View className="min-w-0 flex-1 gap-1">
              <Text variant="label">Option {index + 1}</Text>
              <Input
                onChangeText={(value) => updateOption(option.id, value)}
                placeholder="Nhập lựa chọn"
                value={option.label}
              />
            </View>
            <Pressable
              className="size-11 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              disabled={options.length <= 1}
              onPress={() => removeOption(option.id)}
            >
              <Trash2 color="#64748b" size={16} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Dialog
        onOpenChange={setResultOpen}
        open={resultOpen}
        title="Kết quả vòng quay"
      >
        <Card className="items-center gap-2 bg-slate-50 dark:bg-slate-800">
          <Text variant="muted">Kết quả</Text>
          <Text className="text-center text-2xl font-bold text-slate-950 dark:text-white">
            {winner?.label}
          </Text>
        </Card>
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            onPress={() => setResultOpen(false)}
            variant="outline"
          >
            Đóng
          </Button>
          <Button className="flex-1" onPress={removeWinner} variant="destructive">
            <Trash2 color="#fff" size={17} />
            Xóa
          </Button>
        </View>
      </Dialog>
    </Screen>
  );
}
