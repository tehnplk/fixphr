"use client";

import Chart from "chart.js/auto";
import { useEffect, useRef } from "react";

type ChartSeries = {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string | string[];
};

export default function SummaryChart({
  ariaLabel,
  labels,
  series,
}: {
  ariaLabel: string;
  labels: string[];
  series: ChartSeries[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const chart = new Chart(canvasRef.current, {
      type: "bar",
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
                return ` ${context.dataset.label}: ${value.toLocaleString("th-TH")} รายการ`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: "rgba(23, 53, 43, .08)" },
            ticks: {
              color: "#71877e",
              precision: 0,
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
  }, [labels, series]);

  return <canvas aria-label={ariaLabel} ref={canvasRef} role="img" />;
}
