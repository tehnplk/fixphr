import SummaryPage from "../page";

export default function TypeSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "type" }),
  });
}
