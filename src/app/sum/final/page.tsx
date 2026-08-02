import SummaryPage from "../page";

export default function FinalSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "final" }),
  });
}
