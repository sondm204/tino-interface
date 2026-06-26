"use client";

import type { ReactElement } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  destructive = false,
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  trigger: ReactElement;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {cancelText}
          </DialogClose>
          <DialogClose
            render={
              <Button
                onClick={() => void onConfirm()}
                type="button"
                variant={destructive ? "destructive" : "default"}
              />
            }
          >
            {confirmText}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
