import SummaryPage from "../page";

export default function CompSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "comp" }),
  });
}
