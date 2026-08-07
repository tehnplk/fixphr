import ImportLogTable from "@/components/ImportLogTable";
import UploadForm from "./UploadForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <UploadForm />
        <ImportLogTable />
      </section>
    </main>
  );
}
