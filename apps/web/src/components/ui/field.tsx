import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/src/lib/cn";

function FieldLabel({ label }: { label: string }) {
  return (
    <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {label}
    </Label>
  );
}

export function TextField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} />
      <Input className={cn("h-10", className)} {...props} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} />
      <Combobox
        items={options}
        itemToStringLabel={(option) => option?.label ?? ""}
        onValueChange={(option) => {
          const nextValue = option?.value;

          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        value={selectedOption ?? null}
      >
        <ComboboxInput
          className="h-10 w-full"
          placeholder={`Chọn ${label.toLowerCase()}`}
          showClear={false}
          value={selectedOption?.label ?? ""}
        />
        <ComboboxContent>
          <ComboboxEmpty>Không có kết quả</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(option) => (
                <ComboboxItem
                  className="py-2"
                  key={option.value}
                  value={option}
                >
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function TextAreaField({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} />
      <Textarea className={cn("min-h-20 resize-none", className)} {...props} />
    </div>
  );
}
