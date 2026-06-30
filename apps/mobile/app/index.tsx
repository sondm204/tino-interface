import { Redirect } from "expo-router";
import { LoadingState } from "@/components/screen";
import { useAppSelector } from "@/store/hooks";

export default function IndexPage() {
  const { hydrated, user } = useAppSelector((state) => state.auth);

  if (!hydrated) {
    return <LoadingState label="Đang mở Tino Expense..." />;
  }

  return <Redirect href={user ? "/wallets" : "/login"} />;
}
