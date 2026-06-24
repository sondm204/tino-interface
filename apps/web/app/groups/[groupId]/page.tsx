import { GroupDetailScreen } from "@/src/features/groups/group-detail-screen";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return <GroupDetailScreen groupId={groupId} />;
}
