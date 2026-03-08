import { getDailySummaryRows } from "@/app/actions/report-actions";
import { DayByDayReport } from "@/app/components/day-by-day-report";

export default async function ReportPage() {
  const rows = await getDailySummaryRows();
  return <DayByDayReport rows={rows} generatedAt={new Date().toISOString()} />;
}
