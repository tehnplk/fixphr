"use client";

import Chart, { type Plugin } from "chart.js/auto";
import { useEffect, useRef } from "react";

const CHART_FONT = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';

type ChartSeries = {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string | string[];
};

export default function SummaryChart({
  ariaLabel,
  chartType = "bar",
  labels,
  series,
  valueFormat = "count",
}: {
  ariaLabel: string;
  chartType?: "bar" | "pie";
  labels: string[];
  series: ChartSeries[];
  valueFormat?: "count" | "percent";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // chart.js ไม่มีป้ายค่าในตัว — วาดเองที่ปลายแท่งหลังวาดแท่งเสร็จ
    // แท่งที่ยาวจนชิดขอบขวาไม่มีที่วางป้ายด้านนอก จึงพลิกไปวางในแท่งด้วยตัวอักษรขาว
    const barValueLabels: Plugin<"bar"> = {
      id: "barValueLabels",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.font = `700 10px ${CHART_FONT}`;
        ctx.textBaseline = "middle";

        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;

          meta.data.forEach((element, index) => {
            const value = Number(dataset.data[index] ?? 0);
            // ครบ 100 แสดงเป็นจำนวนเต็ม ค่าอื่นยังเป็นทศนิยม 2 ตำแหน่ง
            const text = valueFormat === "percent"
              ? `${value.toLocaleString("th-TH", {
                  minimumFractionDigits: value >= 100 ? 0 : 2,
                  maximumFractionDigits: value >= 100 ? 0 : 2,
                })}%`
              : value.toLocaleString("th-TH");
            // แท่งที่ค่าล้น max ของแกนจะถูก clip — ยึดป้ายไว้ที่ขอบพื้นที่กราฟ ไม่ให้หลุดออกนอกผ้าใบ
            const barEnd = Math.min(element.x, chartArea.right);
            const fitsOutside = barEnd + 6 + ctx.measureText(text).width <= chartArea.right;

            ctx.fillStyle = fitsOutside ? "#17352b" : "#fff";
            ctx.textAlign = fitsOutside ? "left" : "right";
            ctx.fillText(text, fitsOutside ? barEnd + 6 : barEnd - 6, element.y);
          });
        });

        ctx.restore();
      },
    };

    const chart = chartType === "pie"
      ? new Chart(canvasRef.current, {
          type: "pie",
          data: {
            labels,
            datasets: series.map((dataset) => ({
              ...dataset,
              borderWidth: 3,
              hoverOffset: 8,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 450 },
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: {
                  boxWidth: 12,
                  boxHeight: 12,
                  color: "#48675c",
                  font: {
                    family: '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
                    size: 11,
                    weight: 700,
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    const value = Number(context.raw ?? 0);
                    const values = context.dataset.data.map(Number);
                    const total = values.reduce((sum, item) => sum + item, 0);
                    const percent = total === 0 ? 0 : (value / total) * 100;
                    return ` ${context.label}: ${value.toLocaleString("th-TH")} รายการ (${percent.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)`;
                  },
                },
              },
            },
          },
        })
      : new Chart(canvasRef.current, {
          type: "bar",
          plugins: [barValueLabels],
          data: {
            labels,
            datasets: series.map((dataset) => ({
              ...dataset,
              borderWidth: 1,
              borderRadius: 3,
              barPercentage: .78,
              categoryPercentage: .72,
            })),
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 450,
            },
            plugins: {
              legend: {
                display: series.length > 1,
                position: "bottom",
                labels: {
                  boxWidth: 12,
                  boxHeight: 12,
                  color: "#48675c",
                  font: {
                    family: '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
                    size: 11,
                    weight: 700,
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label(context) {
                    const value = Number(context.raw ?? 0);
                    if (valueFormat === "percent") {
                      return ` ${context.dataset.label}: ${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                    }
                    return ` ${context.dataset.label}: ${value.toLocaleString("th-TH")} รายการ`;
                  },
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                max: valueFormat === "percent" ? 100 : undefined,
                border: { display: false },
                grid: { color: "rgba(23, 53, 43, .08)" },
                ticks: {
                  color: "#71877e",
                  precision: 0,
                  callback(value) {
                    return valueFormat === "percent" ? `${value}%` : value;
                  },
                  font: { size: 10 },
                },
              },
              y: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                  color: "#17352b",
                  font: {
                    family: '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif',
                    size: 10,
                    weight: 700,
                  },
                },
              },
            },
          },
        });

    return () => chart.destroy();
  }, [chartType, labels, series, valueFormat]);

  return <canvas aria-label={ariaLabel} ref={canvasRef} role="img" />;
}
