"use client";

import { useEffect, useState } from "react";

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Bangkok",
  year: "numeric",
});

function formatTimestamp(value: Date) {
  const parts = Object.fromEntries(
    timestampFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const month = THAI_SHORT_MONTHS[Number(parts.month) - 1];
  const buddhistYear = Number(parts.year) + 543;

  return `${parts.day} ${month} ${buddhistYear} เวลา ${parts.hour}:${parts.minute} น.`;
}

export default function RealtimeTimestamp({
  className,
  initialNow,
}: {
  className?: string;
  initialNow: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNow));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p aria-live="off" className={className}>
      ข้อมูล ณ วันที่{" "}
      <time dateTime={now.toISOString()}>
        {formatTimestamp(now)}
      </time>
    </p>
  );
}
