import { WalletDetailScreen } from "@/src/features/wallets/wallet-detail-screen";

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ walletId: string }>;
}) {
  const { walletId } = await params;

  return <WalletDetailScreen walletId={walletId} />;
}
