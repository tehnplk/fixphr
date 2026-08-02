import SummaryPage from "../page";

export default function DistrictSummaryPage() {
  return SummaryPage({
    searchParams: Promise.resolve({ tab: "district" }),
  });
}
