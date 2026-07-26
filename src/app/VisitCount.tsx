"use client";

import { MousePointerClick } from "lucide-react";
import { useEffect, useState } from "react";

type VisitCountProps = {
  initialCount: number;
};

const SESSION_KEY = "fixphr_visit_counted";

export default function VisitCount({ initialCount }: VisitCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, "1");

    void fetch("/api/visits", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to record visit");
        }

        return response.json() as Promise<{ count: number }>;
      })
      .then((data) => setCount(data.count))
      .catch(() => {
        window.sessionStorage.removeItem(SESSION_KEY);
      });
  }, []);

  return (
    <div className="visit-count" aria-label="จำนวนครั้งเข้าใช้งาน">
      <MousePointerClick aria-hidden="true" />
      <span>เข้าใช้งาน <b>{count.toLocaleString("th-TH")}</b> ครั้ง</span>
    </div>
  );
}
