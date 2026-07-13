export type QuickSettleParticipant = {
  id: string;
  name: string;
  paid: number;
};

export type QuickSettleBalance = QuickSettleParticipant & {
  share: number;
  balance: number;
};

export type QuickSettleTransfer = {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
};

export type QuickSettleResult = {
  total: number;
  share: number;
  balances: QuickSettleBalance[];
  transfers: QuickSettleTransfer[];
};

export function calculateQuickSettlement(
  participants: QuickSettleParticipant[],
  precision = 0
): QuickSettleResult {
  const factor = 10 ** Math.max(0, precision);
  const normalized = participants
    .map((participant, index) => {
      const name = participant.name.trim();

      return {
        ...participant,
        id: participant.id || `participant-${index + 1}`,
        name: name || `Người ${index + 1}`,
        paidUnits: Math.round(Number(participant.paid || 0) * factor),
        shouldInclude: Boolean(name) || Number(participant.paid || 0) > 0,
      };
    })
    .filter((participant) => participant.shouldInclude);

  if (normalized.length === 0) {
    return {
      balances: [],
      share: 0,
      total: 0,
      transfers: [],
    };
  }

  const totalUnits = normalized.reduce(
    (sum, participant) => sum + participant.paidUnits,
    0
  );
  const baseShareUnits = Math.floor(totalUnits / normalized.length);
  const extraShareCount = totalUnits % normalized.length;

  const balances = normalized.map((participant, index) => {
    const shareUnits = baseShareUnits + (index < extraShareCount ? 1 : 0);
    const balanceUnits = participant.paidUnits - shareUnits;

    return {
      balance: balanceUnits / factor,
      id: participant.id,
      name: participant.name,
      paid: participant.paidUnits / factor,
      share: shareUnits / factor,
    };
  });

  const debtors = balances
    .filter((participant) => participant.balance < 0)
    .map((participant) => ({
      ...participant,
      remainingUnits: Math.round(Math.abs(participant.balance) * factor),
    }));
  const creditors = balances
    .filter((participant) => participant.balance > 0)
    .map((participant) => ({
      ...participant,
      remainingUnits: Math.round(participant.balance * factor),
    }));

  const transfers: QuickSettleTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountUnits = Math.min(debtor.remainingUnits, creditor.remainingUnits);

    if (amountUnits > 0) {
      transfers.push({
        amount: amountUnits / factor,
        from_id: debtor.id,
        from_name: debtor.name,
        to_id: creditor.id,
        to_name: creditor.name,
      });
    }

    debtor.remainingUnits -= amountUnits;
    creditor.remainingUnits -= amountUnits;

    if (debtor.remainingUnits === 0) debtorIndex += 1;
    if (creditor.remainingUnits === 0) creditorIndex += 1;
  }

  return {
    balances,
    share: totalUnits / normalized.length / factor,
    total: totalUnits / factor,
    transfers,
  };
}
