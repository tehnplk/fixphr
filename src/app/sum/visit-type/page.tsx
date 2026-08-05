import SummaryPage from "../page";

export default function VisitTypeSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "visit-type" }),
  });
}
