export function walletTypeLabel(type: string) {
  const labels: Record<string, string> = {
    personal: "Cá nhân",
    shared: "Nhóm",
  };

  return labels[type] || type;
}

export function memberRoleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "Chủ ví",
    member: "Thành viên",
  };

  return labels[role] || role;
}

export function splitMethodLabel(method: string) {
  const labels: Record<string, string> = {
    equal: "Chia đều",
    amount: "Theo số tiền",
    percentage: "Theo phần trăm",
    shares: "Theo phần",
  };

  return labels[method] || method;
}

export function settlementStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Chờ xử lý",
    paid: "Đã thanh toán",
    cancelled: "Đã hủy",
  };

  return labels[status] || status;
}
