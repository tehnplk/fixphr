import { getPrisma } from "@/lib/prisma";

// csv = อัปโหลดไฟล์เอง, api = กดปุ่มดึงจาก API, api-cron = งานตามเวลา
export type ImportSource = "csv" | "api" | "api-cron";

const SOURCE_LABELS: Record<string, string> = {
  csv: "CSV",
  api: "API",
  "api-cron": "API auto",
};

export function importSourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

// เขียน log ต้องไม่ทำให้การนำเข้าที่สำเร็จไปแล้วกลายเป็นล้มเหลว
export async function recordImport(entry: {
  source: ImportSource;
  status: "success" | "error";
  rowCount?: number;
  hospitalCount?: number;
  fileName?: string;
  message?: string;
}) {
  try {
    await getPrisma().importLog.create({
      data: {
        source: entry.source,
        status: entry.status,
        row_count: entry.rowCount ?? 0,
        hospital_count: entry.hospitalCount ?? 0,
        file_name: (entry.fileName ?? "").slice(0, 255),
        message: entry.message ?? "",
      },
    });
  } catch (error) {
    console.error("Unable to write import log", error);
  }
}

export async function getImportLog(limit: number) {
  const prisma = getPrisma();
  const [rows, total] = await Promise.all([
    prisma.importLog.findMany({ orderBy: { imported_at: "desc" }, take: limit }),
    prisma.importLog.count(),
  ]);
  return { rows, total };
}
