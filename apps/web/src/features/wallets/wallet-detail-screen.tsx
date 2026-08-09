"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Copy,
  FileSearch,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Plus,
  QrCode,
  ReceiptText,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/src/components/ui/field";
import { MonthPicker } from "@/src/components/ui/month-picker";
import { Badge } from "@/src/components/ui/status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  formatMoneyInput,
  parseDateInput,
  parseMoneyInput,
} from "@/src/lib/format";
import { settlementStatusLabel, splitMethodLabel } from "@/src/lib/labels";
import { useAppSelector } from "@/src/store/hooks";
import {
  useCreateExpenseMutation,
  useCreatePaymentQrMutation,
  useCreateReceiptExpenseDraftMutation,
  useCreateTelegramWalletConnectCodeMutation,
  useDeleteWalletMutation,
  useDeleteExpenseAttachmentMutation,
  useDeleteExpenseMutation,
  useFindUserByEmailQuery,
  useGetExpensesQuery,
  useGetWalletMembersQuery,
  useGetSummaryQuery,
  useInviteWalletMemberMutation,
  useLeaveWalletMutation,
  useUpdateExpenseMutation,
  useUploadExpenseAttachmentMutation,
} from "@/src/store/tino-api-slice";
import type { ReceiptExpenseDraft, TelegramCode } from "@/src/services/tino-api";
import type { Attachment, Expense, ExpenseSplit, PaymentQr, User } from "@/src/types/domain";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getSplitAmount(
  method: "equal" | "amount" | "percentage" | "shares",
  userId: string,
  totalAmount: number,
  values: Record<string, string>,
  memberIds: string[]
) {
  if (method === "equal") {
    return totalAmount / Math.max(memberIds.length, 1);
  }

  const value =
    method === "amount"
      ? parseMoneyInput(values[userId])
      : Number(values[userId] || 0);

  if (method === "amount") return value;
  if (method === "percentage") return (totalAmount * value) / 100;

  const totalShares = memberIds.reduce(
    (total, memberId) => total + Number(values[memberId] || 0),
    0
  );
  return totalShares > 0 ? (totalAmount * value) / totalShares : 0;
}

export function WalletDetailScreen({ walletId }: { walletId: string }) {
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const [month, setMonth] = useState(currentMonth());
  const {
    data: walletMembers,
    error: membersError,
    isLoading: membersLoading,
  } = useGetWalletMembersQuery(walletId, {
    skip: !authHydrated || !currentUser,
  });
  const {
    data: expensesData,
    error: expensesError,
    isLoading: expensesLoading,
  } = useGetExpensesQuery(
    { walletId, page: 1, size: 100, month },
    { skip: !authHydrated || !currentUser }
  );
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
  } = useGetSummaryQuery(
    { walletId, month },
    { skip: !authHydrated || !currentUser }
  );
  const [createExpense, createExpenseState] = useCreateExpenseMutation();
  const [createReceiptExpenseDraft, receiptDraftState] =
    useCreateReceiptExpenseDraftMutation();
  const [createTelegramWalletConnectCode, telegramCodeState] =
    useCreateTelegramWalletConnectCodeMutation();
  const [createPaymentQr, paymentQrState] = useCreatePaymentQrMutation();
  const [uploadExpenseAttachment, uploadAttachmentState] =
    useUploadExpenseAttachmentMutation();
  const [deleteExpenseAttachment, deleteAttachmentState] =
    useDeleteExpenseAttachmentMutation();
  const [updateExpense, updateExpenseState] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const [deleteWallet, deleteWalletState] = useDeleteWalletMutation();
  const [leaveWallet, leaveWalletState] = useLeaveWalletMutation();
  const [inviteWalletMember, inviteWalletMemberState] =
    useInviteWalletMemberMutation();
  const users = useMemo(
    () => walletMembers?.map((member) => member.user) ?? [],
    [walletMembers]
  );
  const expenses = useMemo(
    () =>
      (expensesData?.items ?? []).filter((expense) =>
        expense.expense_date.startsWith(month)
      ),
    [expensesData?.items, month]
  );
  const expenseGroups = useMemo(() => {
    const groups = new Map<string, Expense[]>();

    for (const expense of expenses) {
      const date = expense.expense_date.slice(0, 10);
      groups.set(date, [...(groups.get(date) ?? []), expense]);
    }

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  }, [expenses]);
  const wallet = summary?.wallet ?? null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    formatDateInput(new Date().toISOString().slice(0, 10))
  );
  const [splitMethod, setSplitMethod] = useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptExpenseDraft | null>(
    null
  );
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [telegramCode, setTelegramCode] = useState<TelegramCode | null>(null);
  const [paymentQr, setPaymentQr] = useState<PaymentQr | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [debouncedInviteEmail, setDebouncedInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [leaveOwnerDialogOpen, setLeaveOwnerDialogOpen] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const isInviteEmailValid = inviteEmail.trim().includes("@");
  const {
    data: inviteUser,
    error: inviteUserError,
    isFetching: inviteUserFetching,
  } = useFindUserByEmailQuery(debouncedInviteEmail, {
    skip: !inviteDialogOpen || !debouncedInviteEmail,
  });
  const newAttachmentPreviews = useMemo(
    () =>
      newAttachmentFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [newAttachmentFiles]
  );
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<Attachment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editPaidByUserId, setEditPaidByUserId] = useState("");
  const [editSplitMethod, setEditSplitMethod] =
    useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [editSplitValues, setEditSplitValues] = useState<Record<string, string>>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const queryError = [membersError, expensesError, summaryError]
    .map((error) =>
      error &&
        "message" in error &&
        typeof error.message === "string"
        ? error.message
        : null
    )
    .find(Boolean);
  const error = formError || queryError || null;
  const loading =
    !authHydrated || membersLoading || expensesLoading || summaryLoading;
  const saving = createExpenseState.isLoading;
  const receiptExtracting = receiptDraftState.isLoading;
  const inviteUserAlreadyMember = Boolean(
    inviteUser &&
    walletMembers?.some((member) => member.user_id === inviteUser.id)
  );
  const inviteLookupError = inviteUserError?.message ?? null;
  const currentMember = walletMembers?.find(
    (member) => member.user_id === currentUser?.id
  );
  const isWalletOwner = Boolean(
    wallet && currentUser && wallet.owner_id === currentUser.id
  );
  const canLeaveWallet = Boolean(
    wallet && currentUser && wallet.type === "shared" && currentMember
  );
  const ownerTransferOptions = (walletMembers ?? [])
    .filter((member) => member.user_id !== currentUser?.id)
    .map((member) => ({
      value: member.user_id,
      label: member.user.display_name || member.user.email,
    }));

  useEffect(
    () => () => {
      newAttachmentPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    },
    [newAttachmentPreviews]
  );

  useEffect(() => {
    const email = inviteDialogOpen ? inviteEmail.trim().toLowerCase() : "";
    const nextDebouncedEmail = email.includes("@") ? email : "";

    const timeout = window.setTimeout(() => {
      setDebouncedInviteEmail(nextDebouncedEmail);
    }, nextDebouncedEmail ? 500 : 0);

    return () => window.clearTimeout(timeout);
  }, [inviteDialogOpen, inviteEmail]);

  const currentUserWalletExpense = useMemo(() => {
    if (!currentUser || !summary) {
      return 0;
    }

    return (
      summary.member_balances.find((member) => member.user_id === currentUser.id)
        ?.share ?? 0
    );
  }, [currentUser, summary]);

  const userNameById = useMemo(() => {
    const entries = users.map((user) => [user.id, user.display_name || user.email] as const);

    if (currentUser) {
      entries.push([currentUser.id, currentUser.display_name || currentUser.email]);
    }

    return new Map(entries);
  }, [currentUser, users]);

  const getUserName = useCallback(
    (userId: string) => userNameById.get(userId) ?? userId,
    [userNameById]
  );

  const userById = useMemo(() => {
    const entries = users.map((user) => [user.id, user] as const);

    if (currentUser) {
      entries.push([currentUser.id, currentUser]);
    }

    return new Map(entries);
  }, [currentUser, users]);

  const splitMembers = useMemo(() => {
    const memberIds = summary?.member_balances.map((member) => member.user_id) ?? [];

    if (memberIds.length > 0) {
      return memberIds;
    }

    return currentUser ? [currentUser.id] : [];
  }, [currentUser, summary]);

  const splitInputMeta = useMemo(() => {
    if (splitMethod === "amount") {
      return { label: "Số tiền", suffix: wallet?.currency || "VND" };
    }

    if (splitMethod === "percentage") {
      return { label: "Phần trăm", suffix: "%" };
    }

    return { label: "Số phần", suffix: "phần" };
  }, [wallet?.currency, splitMethod]);

  const splitValueTotal = useMemo(
    () =>
      splitMembers.reduce(
        (sum, userId) =>
          sum +
          (splitMethod === "amount"
            ? parseMoneyInput(splitValues[userId])
            : Number(splitValues[userId] || 0)),
        0
      ),
    [splitMembers, splitMethod, splitValues]
  );

  function buildExpenseSplits(totalAmount: number): ExpenseSplit[] | undefined {
    if (wallet?.type !== "shared" || splitMethod === "equal") {
      return undefined;
    }

    if (splitMembers.length === 0) {
      throw new Error("Ví chưa có thành viên để chia chi tiêu.");
    }

    const values = splitMembers.map((userId) => ({
      userId,
      value:
        splitMethod === "amount"
          ? parseMoneyInput(splitValues[userId])
          : Number(splitValues[userId] || 0),
    }));

    if (values.some((item) => !Number.isFinite(item.value) || item.value < 0)) {
      throw new Error("Giá trị chia tiền phải là số không âm.");
    }

    if (values.every((item) => item.value === 0)) {
      throw new Error("Vui lòng nhập giá trị chia cho ít nhất một thành viên.");
    }

    if (splitMethod === "amount") {
      const splitTotal = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(splitTotal - totalAmount) > 0.01) {
        throw new Error("Tổng số tiền chia phải bằng tổng chi tiêu.");
      }

      return values.map((item) => ({
        user_id: item.userId,
        amount: item.value,
      }));
    }

    if (splitMethod === "percentage") {
      const percentageTotal = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(percentageTotal - 100) > 0.01) {
        throw new Error("Tổng phần trăm phải bằng 100%.");
      }

      return values.map((item) => ({
        user_id: item.userId,
        percentage: item.value,
        amount: (totalAmount * item.value) / 100,
      }));
    }

    const totalShares = values.reduce((sum, item) => sum + item.value, 0);

    return values.map((item) => ({
      user_id: item.userId,
      shares: item.value,
      amount: (totalAmount * item.value) / totalShares,
    }));
  }

  async function handleReceiptDraftFile(file: File) {
    if (!wallet) {
      return;
    }

    setFormError(null);

    try {
      const draft = await createReceiptExpenseDraft({
        walletId: wallet.id,
        file,
      }).unwrap();

      setReceiptDraft(draft);
      setTitle(draft.title);
      setDescription(draft.description ?? "");
      setExpenseDate(formatDateInput(draft.expense_date));
      setSplitMethod("equal");
      setSplitValues({});

      if (draft.total_amount && draft.total_amount > 0) {
        setAmount(formatMoneyInput(draft.total_amount));
      }

      setNewAttachmentFiles((current) => {
        const withoutSameFile = current.filter(
          (item) =>
            item.name !== file.name ||
            item.size !== file.size ||
            item.lastModified !== file.lastModified
        );

        return [file, ...withoutSameFile].slice(0, 5);
      });
      toast.success("Đã đọc hoá đơn. Vui lòng kiểm tra trước khi lưu.");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể đọc ảnh hoá đơn";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      const message = "Vui lòng đăng nhập trước khi thêm chi tiêu.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (!wallet) {
      return;
    }

    setFormError(null);

    try {
      const totalAmount = parseMoneyInput(amount);
      const expenseDateValue = parseDateInput(expenseDate);

      if (!expenseDateValue) {
        throw new Error("Ngày chi phải đúng định dạng dd/MM/yyyy.");
      }

      const splits = buildExpenseSplits(totalAmount);
      const createdExpense = await createExpense({
        walletId: wallet.id,
        payload: {
          title,
          description,
          total_amount: totalAmount,
          currency: wallet.currency,
          paid_by_user_id: currentUser.id,
          expense_date: expenseDateValue,
          split_method: splitMethod,
          splits,
        },
      }).unwrap();

      if (newAttachmentFiles.length > 0) {
        try {
          await Promise.all(
            newAttachmentFiles.map((file) =>
              uploadExpenseAttachment({
                walletId: wallet.id,
                expenseId: createdExpense.id,
                file,
              }).unwrap()
            )
          );
        } catch {
          toast.warning(
            "Khoản chi đã được tạo nhưng có ảnh chưa upload thành công."
          );
        }
      }

      setTitle("");
      setDescription("");
      setAmount("");
      setExpenseDate(formatDateInput(new Date().toISOString().slice(0, 10)));
      setSplitMethod("equal");
      setSplitValues({});
      setNewAttachmentFiles([]);
      setReceiptDraft(null);
      toast.success("Lưu chi tiêu thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể tạo chi tiêu";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!wallet) {
      return;
    }

    try {
      await deleteExpense({ walletId: wallet.id, expenseId }).unwrap();
      toast.success("Xóa chi tiêu thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể xóa chi tiêu";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleDeleteWallet() {
    if (!wallet) {
      return;
    }

    try {
      await deleteWallet(wallet.id).unwrap();
      toast.success("Xóa ví thành công");
      router.replace("/wallets");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể xóa ví";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleLeaveWallet(newOwnerId?: string) {
    if (!wallet) {
      return;
    }

    if (isWalletOwner && !newOwnerId) {
      toast.error("Vui lòng chọn thành viên mới làm chủ ví trước khi rời nhóm.");
      return;
    }

    try {
      await leaveWallet({ walletId: wallet.id, newOwnerUserId: newOwnerId }).unwrap();
      toast.success("Đã rời nhóm thành công");
      setLeaveOwnerDialogOpen(false);
      setNewOwnerUserId("");
      router.replace("/wallets");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể rời nhóm";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleInviteWalletMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!wallet || !inviteUser) {
      toast.error("Vui lòng chọn người dùng hợp lệ trước khi mời.");
      return;
    }

    try {
      const result = await inviteWalletMember({
        walletId: wallet.id,
        email: inviteUser.email,
      }).unwrap();
      setInviteEmail("");
      setDebouncedInviteEmail("");
      setInviteDialogOpen(false);
      toast.success(
        result.email_sent
          ? "Đã mời thành viên và gửi email."
          : "Đã mời thành viên. Email chưa được cấu hình nên chưa gửi."
      );
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể mời thành viên.";
      toast.error(message);
    }
  }

  async function handleCreateTelegramWalletCode() {
    if (!wallet) return;

    try {
      const code = await createTelegramWalletConnectCode(wallet.id).unwrap();
      setTelegramCode(code);
      toast.success("Đã tạo mã kết nối Telegram");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo mã kết nối Telegram"
      );
    }
  }

  async function handleCopyTelegramWalletCode() {
    if (!telegramCode) return;
    await navigator.clipboard.writeText(`/connect ${telegramCode.code}`);
    toast.success("Đã sao chép lệnh kết nối");
  }

  async function handleCreatePaymentQr(settlement: {
    to_user_id: string;
    amount: number;
    currency: "VND" | "USD";
  }) {
    if (!wallet) return;

    try {
      const qr = await createPaymentQr({
        walletId: wallet.id,
        payload: {
          to_user_id: settlement.to_user_id,
          amount: settlement.amount,
          currency: settlement.currency,
          month,
        },
      }).unwrap();
      setPaymentQr(qr);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo QR thanh toán. Người nhận cần cấu hình tài khoản ngân hàng."
      );
    }
  }

  function openExpenseEditor(expense: Expense) {
    setSelectedExpense(expense);
    setEditTitle(expense.title);
    setEditDescription(expense.description || "");
    setEditAmount(formatMoneyInput(expense.total_amount));
    setEditExpenseDate(formatDateInput(expense.expense_date));
    setEditPaidByUserId(expense.paid_by_user_id);
    setEditSplitMethod(expense.split_method);
    setEditSplitValues(
      Object.fromEntries(
        (expense.splits ?? []).map((split) => [
          split.user_id,
          expense.split_method === "amount"
            ? formatMoneyInput(split.amount)
            : expense.split_method === "percentage"
              ? String(split.percentage ?? "")
              : String(split.shares ?? ""),
        ])
      )
    );
  }

  async function handleUploadAttachments(files: File[]) {
    if (!selectedExpense || !wallet || files.length === 0) return;

    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        uploaded.push(
          await uploadExpenseAttachment({
            walletId: wallet.id,
            expenseId: selectedExpense.id,
            file,
          }).unwrap()
        );
      }
      setSelectedExpense((current) =>
        current
          ? {
            ...current,
            attachments: [...(current.attachments ?? []), ...uploaded],
          }
          : current
      );
      toast.success("Đã thêm ảnh vào khoản chi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể upload ảnh");
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!selectedExpense || !wallet) return;

    try {
      await deleteExpenseAttachment({
        walletId: wallet.id,
        expenseId: selectedExpense.id,
        attachmentId,
      }).unwrap();
      setSelectedExpense((current) =>
        current
          ? {
            ...current,
            attachments: (current.attachments ?? []).filter(
              (attachment) => attachment.id !== attachmentId
            ),
          }
          : current
      );
      toast.success("Đã xóa ảnh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa ảnh");
    }
  }

  async function handleUpdateSelectedExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExpense || !wallet) {
      return;
    }

    const totalAmount = parseMoneyInput(editAmount);

    if (!editTitle.trim() || totalAmount <= 0 || !editPaidByUserId) {
      toast.error("Vui lòng nhập đầy đủ tên, số tiền và người thanh toán.");
      return;
    }

    try {
      const editExpenseDateValue = parseDateInput(editExpenseDate);

      if (!editExpenseDateValue) {
        throw new Error("Ngày chi phải đúng định dạng dd/MM/yyyy.");
      }

      let splits: ExpenseSplit[] = [];

      if (wallet.type === "shared" && editSplitMethod !== "equal") {
        const values = splitMembers.map((userId) => ({
          userId,
          value:
            editSplitMethod === "amount"
              ? parseMoneyInput(editSplitValues[userId])
              : Number(editSplitValues[userId] || 0),
        }));

        if (
          values.some((item) => !Number.isFinite(item.value) || item.value < 0) ||
          values.every((item) => item.value === 0)
        ) {
          throw new Error(
            "Vui lòng nhập giá trị hợp lệ cho ít nhất một thành viên."
          );
        }

        const total = values.reduce((sum, item) => sum + item.value, 0);

        if (
          editSplitMethod === "amount" &&
          Math.abs(total - totalAmount) > 0.01
        ) {
          throw new Error("Tổng số tiền chia phải bằng tổng khoản chi.");
        }

        if (
          editSplitMethod === "percentage" &&
          Math.abs(total - 100) > 0.01
        ) {
          throw new Error("Tổng phần trăm phải bằng 100%.");
        }

        splits = values.map((item) => ({
          amount:
            editSplitMethod === "amount"
              ? item.value
              : (totalAmount * item.value) / total,
          percentage:
            editSplitMethod === "percentage" ? item.value : undefined,
          shares: editSplitMethod === "shares" ? item.value : undefined,
          user_id: item.userId,
        }));
      }

      await updateExpense({
        walletId: wallet.id,
        expenseId: selectedExpense.id,
        payload: {
          description: editDescription.trim() || null,
          expense_date: editExpenseDateValue,
          paid_by_user_id: editPaidByUserId,
          split_method: editSplitMethod,
          splits,
          title: editTitle.trim(),
          total_amount: totalAmount,
        },
      }).unwrap();

      setSelectedExpense(null);
      toast.success("Cập nhật chi tiêu thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật chi tiêu");
    }
  }

  function handleMonthChange(value: string) {
    setMonth(value);
  }

  function handleInviteDialogOpenChange(open: boolean) {
    setInviteDialogOpen(open);

    if (!open) {
      setInviteEmail("");
      setDebouncedInviteEmail("");
    }
  }

  function getUserProfileInitials(user: Pick<User, "display_name" | "email">) {
    const source = user.display_name || user.email;
    const words = source.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }

  function getUserInitials(userId: string) {
    const source = getUserName(userId);
    const words = source.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }

  function renderUserAvatar(userId: string) {
    const user = userById.get(userId);
    const name = getUserName(userId);

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={name}
              className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              type="button"
            />
          }
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-full object-cover" src={user.avatar_url} />
          ) : (
            getUserInitials(userId)
          )}
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    );
  }

  function getExpenseSplitRows(expense: Expense) {
    if (expense.splits?.length) {
      return expense.splits.map((split) => ({
        userId: split.user_id,
        amount: Number(split.amount ?? 0),
        percentage: split.percentage,
        shares: split.shares,
      }));
    }

    if (splitMembers.length === 0) {
      return [];
    }

    const equalAmount = Number(expense.total_amount) / splitMembers.length;

    return splitMembers.map((userId) => ({
      userId,
      amount: equalAmount,
      percentage: null,
      shares: null,
    }));
  }

  return (
    <AppShell
      subtitle="Chi tiết ví"
      title={wallet?.name || "Ví chi tiêu"}
    >
      <div className="mb-4 flex justify-between">
        <Link
          className="flex items-center gap-2"
          href="/wallets"
        >
          <Button
            type="button"
            variant="outline"
          >
            <ArrowLeft size={16} />
            Quay lại
          </Button>
        </Link>

        <div className="flex justify-end gap-2">
          {canLeaveWallet && !isWalletOwner ? (
            <ConfirmDialog
              confirmText="Rời nhóm"
              description="Bạn sẽ không còn thấy ví này trong danh sách và không thể ghi chi tiêu vào ví nữa."
              destructive
              onConfirm={() => handleLeaveWallet()}
              title="Rời khỏi nhóm này?"
              trigger={
                <Button
                  disabled={leaveWalletState.isLoading}
                  type="button"
                  variant="outline"
                >
                  <LogOut size={16} />
                  {leaveWalletState.isLoading ? "Đang rời..." : "Rời nhóm"}
                </Button>
              }
            />
          ) : null}

          {canLeaveWallet && isWalletOwner && ownerTransferOptions.length > 0 ? (
            <Button
              disabled={leaveWalletState.isLoading}
              onClick={() => setLeaveOwnerDialogOpen(true)}
              type="button"
              variant="outline"
            >
              <LogOut size={16} />
              Rời nhóm
            </Button>
          ) : null}

          {isWalletOwner ? (
            <ConfirmDialog
              confirmText="Xóa ví"
              description="Ví sẽ được ẩn khỏi danh sách và không thể tiếp tục ghi chi tiêu. Các dữ liệu cũ vẫn được giữ trong hệ thống."
              destructive
              onConfirm={handleDeleteWallet}
              title="Xóa ví này?"
              trigger={
                <Button
                  disabled={deleteWalletState.isLoading}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 size={16} />
                  {deleteWalletState.isLoading ? "Đang xóa..." : "Xóa ví"}
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng tháng
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-28" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {formatCurrency(summary?.total_amount || 0, wallet?.currency || "VND")}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng chi tiêu cá nhân
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-28" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {formatCurrency(currentUserWalletExpense, wallet?.currency || "VND")}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Quyết toán
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {summary?.settlements.length || 0}
                </p>
              )}
            </Card>
          </section>

          <Card>
            <CardHeader
              action={
                <MonthPicker
                  ariaLabel="Chọn tháng chi tiêu"
                  onValueChange={handleMonthChange}
                  value={month}
                  variant="button"
                />
              }
              description="Các khoản chi tiêu hiện tại của ví"
              title="Chi tiêu"
            />
            {loading ? (
              <div className="px-2 pb-2">
                <div className="min-w-[760px] divide-y divide-zinc-200 dark:divide-zinc-800">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.8fr_0.8fr_40px] items-center gap-4 px-2 py-4"
                      key={index}
                    >
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="ml-auto h-5 w-24" />
                      <Skeleton className="size-8" />
                    </div>
                  ))}
                </div>
              </div>
            ) : expenses.length === 0 ? (
              <EmptyState
                description="Thêm tiền nhà, ăn uống, điện nước hoặc bất kỳ khoản chi chung nào."
                icon={<ReceiptText size={20} />}
                title="Chưa có khoản chi nào"
              />
            ) : (
              <div className="px-2 pb-2">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khoản chi</TableHead>
                      <TableHead>Người trả</TableHead>
                      {wallet?.type === "shared" && <TableHead>Cách chia</TableHead>}
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseGroups.map((group) => (
                      <Fragment key={group.date}>
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            className="bg-zinc-50 py-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
                            colSpan={wallet?.type === "shared" ? 6 : 5}
                          >
                            {formatDate(group.date)}
                          </TableCell>
                        </TableRow>
                        {group.items.map((expense) => (
                          <TableRow
                            className="cursor-pointer"
                            key={expense.id}
                            onClick={() => openExpenseEditor(expense)}
                          >
                            <TableCell>
                              <p className="font-semibold">{expense.title}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {expense.description || ""}
                              </p>
                            </TableCell>
                            <TableCell>
                              {renderUserAvatar(expense.paid_by_user_id)}
                            </TableCell>
                            {wallet?.type === "shared" && (
                              <TableCell className="text-zinc-600 dark:text-zinc-300">
                                {splitMethodLabel(expense.split_method)}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(expense.total_amount, expense.currency)}
                            </TableCell>
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <ConfirmDialog
                                confirmText="Xóa"
                                description={`Khoản chi "${expense.title}" sẽ bị xóa khỏi ví.`}
                                destructive
                                onConfirm={() => handleDeleteExpense(expense.id)}
                                title="Xóa khoản chi?"
                                trigger={
                                  <Button
                                    aria-label="Xóa chi tiêu"
                                    className="ml-auto"
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader
                action={
                  wallet?.type === "shared" && currentUser?.id === wallet.owner_id ? (
                    <Button
                      aria-label="Mời thành viên"
                      onClick={() => setInviteDialogOpen(true)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Plus size={16} />
                    </Button>
                  ) : null
                }
                description="Tổng số tiền từng thành viên đã thanh toán trong tháng"
                title="Thành viên đã chi"
              />
              {loading ? (
                <CardBody className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={index}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))}
                </CardBody>
              ) : (
                <CardBody className="space-y-3">
                  {summary?.member_balances.length ? (
                    summary.member_balances.map((member) => (
                      <div
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                        key={member.user_id}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{getUserName(member.user_id)}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Phần cần chịu {formatCurrency(member.share, summary.currency)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(member.paid, summary.currency)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Chưa có dữ liệu chi tiêu của thành viên.
                    </p>
                  )}
                </CardBody>
              )}
            </Card>

            <Card>
              <CardHeader
                description="Gợi ý chuyển tiền cho tháng đang chọn"
                title="Gợi ý quyết toán"
              />
              {loading ? (
                <CardBody className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={index}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="mt-3 h-6 w-28" />
                    </div>
                  ))}
                </CardBody>
              ) : (
                <CardBody className="space-y-3">
                  {summary?.settlements.length ? (
                    summary.settlements.map((settlement) => (
                      <div
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                        key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm">
                            <span className="font-semibold">
                              {getUserName(settlement.from_user_id)}
                            </span>{" "}
                            trả cho{" "}
                            <span className="font-semibold">
                              {getUserName(settlement.to_user_id)}
                            </span>
                          </p>
                          <Badge tone="amber">{settlementStatusLabel("pending")}</Badge>
                        </div>
                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(settlement.amount, settlement.currency)}
                        </p>
                        {currentUser?.id === settlement.from_user_id ? (
                          <Button
                            className="mt-3"
                            disabled={paymentQrState.isLoading}
                            onClick={() => void handleCreatePaymentQr(settlement)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <QrCode />
                            Tạo QR thanh toán
                          </Button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Tháng này chưa cần quyết toán.
                    </p>
                  )}
                </CardBody>
              )}
            </Card>
          </section>

          {wallet && currentUser?.id === wallet.owner_id ? (
            <Card className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    <Send size={18} />
                    Kết nối Telegram
                  </div>
                  {telegramCode ? (
                    <>
                      <p className="mt-2 font-mono text-lg font-semibold tracking-wider">
                        /connect {telegramCode.code}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Hết hạn lúc{" "}
                        {new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(telegramCode.expires_at))}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Tạo mã một lần, sau đó gửi lệnh trong Telegram group.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {telegramCode ? (
                    <Button
                      onClick={() => void handleCopyTelegramWalletCode()}
                      type="button"
                      variant="outline"
                    >
                      <Copy size={16} />
                      Sao chép
                    </Button>
                  ) : null}
                  <Button
                    disabled={telegramCodeState.isLoading}
                    onClick={() => void handleCreateTelegramWalletCode()}
                    type="button"
                  >
                    <Send size={16} />
                    {telegramCodeState.isLoading
                      ? "Đang tạo..."
                      : telegramCode
                        ? "Tạo mã mới"
                        : "Tạo mã"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader
            action={
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="Đọc hoá đơn"
                      disabled={receiptExtracting || !wallet}
                      onClick={() => receiptInputRef.current?.click()}
                      size="icon"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  {receiptExtracting ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <FileSearch size={18} />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {receiptExtracting ? "Đang đọc hoá đơn" : "Đọc hoá đơn"}
                </TooltipContent>
              </Tooltip>
            }
            description="Lưu khoản chi vào ví đang chọn"
            title="Thêm chi tiêu"
          />
          <CardBody>
            <form className="space-y-4" id="create-expense-form" onSubmit={handleCreateExpense}>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";

                  if (file) {
                    void handleReceiptDraftFile(file);
                  }
                }}
                ref={receiptInputRef}
                type="file"
              />
              <TextField
                className={receiptExtracting ? "animate-pulse bg-zinc-100 dark:bg-zinc-900" : undefined}
                disabled={receiptExtracting}
                label="Tên khoản chi"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={receiptExtracting ? "Đang nhận diện tên khoản chi..." : "Tiền nhà tháng này"}
                required
                value={title}
              />
              <TextAreaField
                className={receiptExtracting ? "animate-pulse bg-zinc-100 dark:bg-zinc-900" : undefined}
                disabled={receiptExtracting}
                label="Mô tả"
                onChange={(event) => setDescription(event.target.value)}
                placeholder={receiptExtracting ? "Đang đọc nội dung hoá đơn..." : "Thông tin bổ sung"}
                value={description}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  className={receiptExtracting ? "animate-pulse bg-zinc-100 dark:bg-zinc-900" : undefined}
                  disabled={receiptExtracting}
                  label="Số tiền"
                  min="1"
                  inputMode="numeric"
                  onChange={(event) =>
                    setAmount(formatMoneyInput(event.target.value))
                  }
                  placeholder={receiptExtracting ? "Đang đọc..." : "0"}
                  required
                  type="text"
                  value={amount}
                />
                <TextField
                  className={receiptExtracting ? "animate-pulse bg-zinc-100 dark:bg-zinc-900" : undefined}
                  disabled={receiptExtracting}
                  label="Ngày"
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                  placeholder={receiptExtracting ? "Đang đọc..." : "dd/MM/yyyy"}
                  type="text"
                  value={expenseDate}
                />
              </div>
              {wallet?.type === "shared" && (
                <>
                  <SelectField
                    label="Cách chia"
                    onValueChange={(value) => {
                      setSplitMethod(
                        value as "equal" | "amount" | "percentage" | "shares"
                      );
                      setSplitValues({});
                    }}
                    options={[
                      { value: "equal", label: "Chia đều" },
                      { value: "amount", label: "Theo số tiền" },
                      { value: "percentage", label: "Theo phần trăm" },
                      { value: "shares", label: "Theo phần" },
                    ]}
                    value={splitMethod}
                  />
                  {splitMethod !== "equal" ? (
                    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <div>
                        <p className="text-sm font-semibold">
                          Giá trị chia theo thành viên
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Nhập {splitInputMeta.label.toLowerCase()} cho từng thành viên.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {splitMembers.map((userId) => (
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-3"
                            key={userId}
                          >
                            <p className="truncate text-sm font-medium">
                              {getUserName(userId)}
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                className="h-9 min-w-0 rounded-md border border-zinc-200 bg-white px-3 text-right text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                                min="0"
                                inputMode={
                                  splitMethod === "amount" ? "numeric" : "decimal"
                                }
                                onChange={(event) =>
                                  setSplitValues((current) => ({
                                    ...current,
                                    [userId]:
                                      splitMethod === "amount"
                                        ? formatMoneyInput(event.target.value)
                                        : event.target.value,
                                  }))
                                }
                                placeholder="0"
                                step="0.01"
                                type="text"
                                value={splitValues[userId] ?? ""}
                              />
                              <span className="w-10 text-xs text-zinc-500 dark:text-zinc-400">
                                {splitInputMeta.suffix}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Tổng đang nhập:{" "}
                        <span className="font-medium text-zinc-950 dark:text-zinc-50">
                          {splitMethod === "amount"
                            ? formatCurrency(splitValueTotal, wallet.currency)
                            : `${splitValueTotal} ${splitInputMeta.suffix}`}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Ảnh hóa đơn, sản phẩm</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
                  <ImagePlus size={18} />
                  Chọn ảnh
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    multiple
                    onChange={(event) =>
                      setNewAttachmentFiles(
                        Array.from(event.target.files ?? []).slice(0, 5)
                      )
                    }
                    type="file"
                  />
                </label>
                {newAttachmentFiles.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {newAttachmentPreviews.map(({ file, url }, index) => (
                      <div
                        className="group relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                        key={`${file.name}-${file.lastModified}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={file.name}
                          className="size-full object-cover"
                          src={url}
                        />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1.5 text-xs text-white">
                          {file.name}
                        </span>
                        <Button
                          className="absolute right-1 top-1 bg-white/90 dark:bg-zinc-950/90"
                          aria-label="Bỏ ảnh"
                          onClick={() =>
                            setNewAttachmentFiles((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index)
                            )
                          }
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <X size={15} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button
                className="w-full"
                disabled={saving || uploadAttachmentState.isLoading || receiptExtracting}
                type="submit"
              >
                <Plus size={17} />
                {saving ? "Đang lưu..." : "Lưu chi tiêu"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Dialog
        onOpenChange={(open) => {
          setLeaveOwnerDialogOpen(open);

          if (!open) {
            setNewOwnerUserId("");
          }
        }}
        open={leaveOwnerDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn chủ ví mới</DialogTitle>
            <DialogDescription>
              Bạn đang là chủ ví. Hãy chọn một thành viên khác làm chủ ví trước khi rời nhóm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SelectField
              label="Chủ ví mới"
              onValueChange={setNewOwnerUserId}
              options={ownerTransferOptions}
              value={newOwnerUserId}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setLeaveOwnerDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Hủy
              </Button>
              <Button
                disabled={leaveWalletState.isLoading || !newOwnerUserId}
                onClick={() => handleLeaveWallet(newOwnerUserId)}
                type="button"
                variant="destructive"
              >
                <LogOut size={16} />
                {leaveWalletState.isLoading ? "Đang rời..." : "Rời nhóm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={handleInviteDialogOpenChange} open={inviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form className="space-y-4" onSubmit={handleInviteWalletMember}>
            <DialogHeader>
              <DialogTitle>Mời thành viên</DialogTitle>
              <DialogDescription>
                Nhập email để tìm người dùng đã có tài khoản Tino, sau đó chọn mời vào ví.
              </DialogDescription>
            </DialogHeader>

            <TextField
              label="Email"
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={inviteEmail}
            />

            <div className="min-h-20 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              {!isInviteEmailValid ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nhập email hợp lệ để tìm người dùng.
                </p>
              ) : inviteUserFetching ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              ) : inviteUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
                    {getUserProfileInitials(inviteUser)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {inviteUser.display_name || inviteUser.email}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {inviteUser.email}
                    </p>
                    {inviteUserAlreadyMember ? (
                      <p className="mt-1 text-xs font-medium text-amber-600">
                        Người dùng này đã là thành viên của ví.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : debouncedInviteEmail && inviteLookupError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  Không tìm thấy người dùng với email này.
                </p>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Dừng nhập một chút để hệ thống tự tìm người dùng.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => handleInviteDialogOpenChange(false)}
                type="button"
                variant="outline"
              >
                Hủy
              </Button>
              <Button
                disabled={
                  inviteWalletMemberState.isLoading ||
                  inviteUserFetching ||
                  !inviteUser ||
                  inviteUserAlreadyMember
                }
                type="submit"
              >
                <Plus size={16} />
                {inviteWalletMemberState.isLoading ? "Đang mời..." : "Mời người này"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExpense(null);
          }
        }}
        open={selectedExpense !== null}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedExpense ? (
            <form className="space-y-5" onSubmit={handleUpdateSelectedExpense}>
              <DialogHeader>
                <DialogTitle>Chỉnh sửa chi tiêu</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin và phần chia của khoản chi.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <TextField
                  label="Tên khoản chi"
                  onChange={(event) => setEditTitle(event.target.value)}
                  required
                  value={editTitle}
                />
                <TextAreaField
                  label="Mô tả"
                  onChange={(event) => setEditDescription(event.target.value)}
                  value={editDescription}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    inputMode="numeric"
                    label="Số tiền"
                    onChange={(event) =>
                      setEditAmount(formatMoneyInput(event.target.value))
                    }
                    required
                    type="text"
                    value={editAmount}
                  />
                  <TextField
                    label="Ngày chi"
                    onChange={(event) => setEditExpenseDate(event.target.value)}
                    required
                    placeholder="dd/MM/yyyy"
                    type="text"
                    value={editExpenseDate}
                  />
                </div>
                <SelectField
                  label="Người thanh toán"
                  onValueChange={setEditPaidByUserId}
                  options={users.map((user) => ({
                    label: user.display_name || user.email,
                    value: user.id,
                  }))}
                  value={editPaidByUserId}
                />
                {wallet?.type === "shared" ? (
                  <>
                    <SelectField
                      label="Cách chia"
                      onValueChange={(value) => {
                        setEditSplitMethod(
                          value as "equal" | "amount" | "percentage" | "shares"
                        );
                        setEditSplitValues({});
                      }}
                      options={[
                        { value: "equal", label: "Chia đều" },
                        { value: "amount", label: "Theo số tiền" },
                        { value: "percentage", label: "Theo phần trăm" },
                        { value: "shares", label: "Theo phần" },
                      ]}
                      value={editSplitMethod}
                    />
                    <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                      <p className="text-sm font-semibold">Phần chi của từng người</p>
                      {splitMembers.map((userId) => (
                        <div
                          className="grid grid-cols-[minmax(0,1fr)_190px] items-center gap-3"
                          key={userId}
                        >
                          <p className="truncate text-sm font-medium">
                            {getUserName(userId)}
                          </p>
                          {editSplitMethod === "equal" ? (
                            <p className="text-right text-xs font-semibold text-blue-600">
                              Phải chịu:{" "}
                              {formatCurrency(
                                getSplitAmount(
                                  editSplitMethod,
                                  userId,
                                  parseMoneyInput(editAmount),
                                  editSplitValues,
                                  splitMembers
                                ),
                                wallet.currency
                              )}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <input
                                  className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-right text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                                  inputMode={
                                    editSplitMethod === "amount"
                                      ? "numeric"
                                      : "decimal"
                                  }
                                  onChange={(event) =>
                                    setEditSplitValues((current) => ({
                                      ...current,
                                      [userId]:
                                        editSplitMethod === "amount"
                                          ? formatMoneyInput(event.target.value)
                                          : event.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  type="text"
                                  value={editSplitValues[userId] || ""}
                                />
                                <span className="w-10 text-xs text-zinc-500">
                                  {editSplitMethod === "amount"
                                    ? wallet.currency
                                    : editSplitMethod === "percentage"
                                      ? "%"
                                      : "phần"}
                                </span>
                              </div>
                              <p className="text-right text-xs font-semibold text-blue-600">
                                Phải chịu:{" "}
                                {formatCurrency(
                                  getSplitAmount(
                                    editSplitMethod,
                                    userId,
                                    parseMoneyInput(editAmount),
                                    editSplitValues,
                                    splitMembers
                                  ),
                                  wallet.currency
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Ảnh đính kèm</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                      <ImagePlus size={16} />
                      Thêm ảnh
                      <input
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        multiple
                        onChange={(event) => {
                          void handleUploadAttachments(
                            Array.from(event.target.files ?? []).slice(0, 5)
                          );
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                  </div>
                  {selectedExpense.attachments?.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {selectedExpense.attachments.map((attachment) => (
                        <div
                          className="group relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                          key={attachment.id}
                        >
                          <button
                            aria-label={`Xem ảnh ${attachment.file_name}`}
                            className="size-full cursor-zoom-in"
                            onClick={() => setPreviewAttachment(attachment)}
                            type="button"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={attachment.file_name}
                              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                              src={attachment.file_url}
                            />
                          </button>
                          <Button
                            aria-label="Xóa ảnh"
                            className="absolute right-1 top-1 bg-white/90 dark:bg-zinc-950/90"
                            disabled={deleteAttachmentState.isLoading}
                            onClick={() =>
                              void handleDeleteAttachment(attachment.id)
                            }
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="text-red-600" size={15} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Chưa có ảnh đính kèm.
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  updateExpenseState.isLoading ||
                  uploadAttachmentState.isLoading ||
                  deleteAttachmentState.isLoading
                }
                type="submit"
              >
                {updateExpenseState.isLoading
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </Button>

              <div className="hidden grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Người trả
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {renderUserAvatar(selectedExpense.paid_by_user_id)}
                    <p className="text-sm font-semibold">
                      {getUserName(selectedExpense.paid_by_user_id)}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tổng tiền
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatCurrency(
                      selectedExpense.total_amount,
                      selectedExpense.currency
                    )}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Ngày chi
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatDate(selectedExpense.expense_date)}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Cách chia
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {splitMethodLabel(selectedExpense.split_method)}
                  </p>
                </div>
              </div>

              <div className="hidden space-y-3">
                <div>
                  <p className="text-sm font-semibold">Phần chia</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Số tiền mỗi thành viên chịu cho khoản chi này.
                  </p>
                </div>
                <div className="space-y-2">
                  {getExpenseSplitRows(selectedExpense).map((split) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={split.userId}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {renderUserAvatar(split.userId)}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {getUserName(split.userId)}
                          </p>
                          {selectedExpense.split_method === "percentage" &&
                            split.percentage ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {Number(split.percentage)}%
                            </p>
                          ) : null}
                          {selectedExpense.split_method === "shares" && split.shares ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {Number(split.shares)} phần
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(split.amount, selectedExpense.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPaymentQr(null);
        }}
        open={paymentQr !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR thanh toán</DialogTitle>
            <DialogDescription>
              Mở app ngân hàng và quét mã để chuyển đúng số tiền.
            </DialogDescription>
          </DialogHeader>
          {paymentQr ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-md border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="QR thanh toán"
                  className="size-64 object-contain"
                  src={paymentQr.qr_image_url}
                />
              </div>
              <div className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{paymentQr.receiver.account_name}</p>
                <p>{paymentQr.receiver.bank_name} · {paymentQr.receiver.account_number}</p>
                <p>{formatCurrency(paymentQr.amount, paymentQr.currency)}</p>
                <p className="text-muted-foreground">{paymentQr.content}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
        open={previewAttachment !== null}
      >
        <DialogContent className="max-w-[95vw] border-0 bg-black/95 p-2 text-white sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewAttachment?.file_name || "Xem ảnh"}</DialogTitle>
            <DialogDescription>Ảnh đính kèm của khoản chi.</DialogDescription>
          </DialogHeader>
          {previewAttachment ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={previewAttachment.file_name}
              className="max-h-[88vh] w-full object-contain"
              src={previewAttachment.file_url}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
