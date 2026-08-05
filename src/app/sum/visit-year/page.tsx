import SummaryPage from "../page";

export default function VisitYearSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "visit-year" }),
  });
}
