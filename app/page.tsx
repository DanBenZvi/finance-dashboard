import { fetchAllData } from "@/lib/google-sheets";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await fetchAllData();

  return <DashboardShell data={data} />;
}
