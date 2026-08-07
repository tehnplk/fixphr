import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ImportLogTable from "@/components/ImportLogTable";
import { PHR_MASK_HOSPITAL_URL } from "@/lib/complaint-import";
import ImportApiForm from "./ImportApiForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ImportApiPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "super" && role !== "admin") {
    redirect("/login?error=forbidden&callbackUrl=%2Fimport-api");
  }

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <ImportApiForm sourceUrl={PHR_MASK_HOSPITAL_URL} />
        <ImportLogTable />
      </section>
    </main>
  );
}
