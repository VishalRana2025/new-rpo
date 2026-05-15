import React, { lazy, Suspense, useEffect, useRef } from "react";

const ReactECharts = lazy(() =>
  import("echarts-for-react")
);

const ActivityChart = ({ data, onBarClick }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth < 640 && chartRef.current) {
   setTimeout(() => {

  chartRef.current.scrollLeft =
    chartRef.current.scrollWidth;

}, 200);
    }
  }, [data]);

  const dates = data.map(item => item.date || "No Client");
  const createData = data.map(item => item.create);
  const updateData = data.map(item => item.update);
  // ✅ detect client chart (only create values, no update)
  const isCreatedChart =
  data.length > 0 &&
  data.every(item => item.update === 0);

const isUpdatedChart =
  data.length > 0 &&
  data.every(item => item.create === 0);
const isClientChart =
  data.length > 0 &&
  data.some(item =>
    item.date &&
    item.date.length > 10
  );
  // Helper function to safely get details based on action
  const getDetailsByAction = (dayData, action) => {
    if (!dayData) return [];

    const act = action.toLowerCase();

    if (act === "create") return dayData.createDetails || [];
    if (act === "update") return dayData.updateDetails || [];

    return [];
  };

  // ✅ CUSTOM TOOLTIP - Shows recruiter-wise counts for CREATE and UPDATE
  const getTooltipHtml = (params, dayData, action, value) => {
    if (!dayData) return "No data";

    const details = getDetailsByAction(dayData, action);

    // Color configuration
    const config = {
      Create: { color: "#22c55e", icon: "✚", name: "CREATE Activity", textColor: "text-green-400" },
      Update: { color: "#3b82f6", icon: "✎", name: "UPDATE Activity", textColor: "text-blue-400" },
    };

    const act = action.toLowerCase();

    const cfg =
      act === "create"
        ? config.Create
        : act === "update"
          ? config.Update
          : config.Create;

    let html = `<div style="font-weight:600;margin-bottom:8px;border-bottom:1px solid #374151;padding-bottom:4px">📅 ${dayData.date}</div>`;

    html += `<div style="color:${cfg.color};font-size:14px;margin-bottom:8px">
   <strong>
  ${act === "create" ? "✚ CREATE Activity" : "✎ UPDATE Activity"}
</strong><br/>
      Total Today: <strong style="font-size:18px">${value}</strong>
    </div>`;

    // ✅ SHOW RECRUITER-WISE COUNT (Grouped by user)
    if (details && details.length > 0) {
      html += `<hr style="margin:8px 0;border-color:#374151"/>`;
      html += `<div style="font-size:11px;color:#9ca3af;margin-bottom:6px">👥 By Recruiter:</div>`;

      details.forEach((item, idx) => {
        html += `
          <div style="font-size:12px;margin-top:4px;background:#1f2937;padding:6px 8px;border-radius:6px;display:flex;justify-content:space-between">
            <span style="color:#e5e7eb">${item.user || "System"}</span>
            <span style="color:${cfg.color};font-weight:bold">${item.count}</span>
          </div>
        `;
      });

      // Add total recruiters count
      html += `<hr style="margin:8px 0;border-color:#374151"/>`;
      html += `<div style="font-size:11px;color:#9ca3af;margin-top:4px;display:flex;justify-content:space-between">
        <span>📊 Total Recruiters:</span>
        <span style="color:${cfg.color};font-weight:bold">${details.length}</span>
      </div>`;

    } else {
      html += `<div style="font-size:12px;color:#6b7280;margin-top:8px;padding:8px;background:#1f2937;border-radius:6px;text-align:center">
        No ${action.toLowerCase()} activities today
      </div>`;
    }

    return html;
  };

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: function (params) {
        if (!params || params.length === 0) return "";

        // 🔥 pick correct bar (create/update)
        const hoveredBar = params.find(p => p.value > 0);

        if (!hoveredBar) return "";

        const index = hoveredBar.dataIndex;
        const dayData = data[index];
        const action = hoveredBar.seriesName;
        const value = hoveredBar.value;

        if (value === 0) return "";

        return getTooltipHtml(params, dayData, action, value);
      }
    },
    legend: {
      show: false
    },
   grid: {
  left: "5%",
  right: "5%",
  bottom: "20%",
  top: "10%",
  containLabel: true
},
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#444" } },
      axisLabel: {
        color: "#ccc",
        rotate: 0,
        fontSize:isCreatedChart || isUpdatedChart? 9 : 11,
        interval: 0,
        hideOverlap: false,
showMinLabel: true,
showMaxLabel: true,
        margin: 28,
       formatter: function (value) {
  const words = value.split(" ");
  let lines = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + word).length > 12) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  });

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
}
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      name: "",
      nameTextStyle: { color: "#aaa" },
      axisLine: { lineStyle: { color: "#444" } },
      splitLine: { lineStyle: { color: "#333", type: "dashed" } },
      axisLabel: { color: "#ccc" }
    },
    series: [
      {
        name: "Create",
        type: "bar",
        data: createData.map(v => v === 0 ? null : v),
        itemStyle: {
          color: function (params) {
            // ✅ only apply for client chart
        if (!(isCreatedChart || isUpdatedChart))
  return "#22c55e";

            const colors = [
              "#22c55e", // green
              "#3b82f6", // blue
              "#f59e0b", // yellow
              "#ef4444", // red
              "#8b5cf6", // purple
              "#14b8a6", // teal
              "#f97316", // orange
              "#06b6d4"  // cyan
            ];

            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [4, 4, 0, 0],
          shadowColor: "rgba(34, 197, 94, 0.3)",
          shadowBlur: 10
        },
       barWidth: 32,
barMinHeight: 2,
        label: {
          show: true,
          position: "top",
          color: "#22c55e",
          fontSize: 11,
          fontWeight: "bold",
          formatter: (params) => params.value > 0 ? params.value : ''
        }
      },
      {
        name: "Update",
        type: "bar",
       data: updateData.map(v => v === 0 ? null : v),
        itemStyle: {
          color: function (params) {
            const colors = [
              "#22c55e", // green
              "#3b82f6", // blue
              "#f59e0b", // yellow
              "#ef4444", // red
              "#8b5cf6", // purple
              "#14b8a6", // teal
              "#f97316", // orange
              "#06b6d4"  // cyan
            ];

            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [4, 4, 0, 0],
          shadowColor: "rgba(59, 130, 246, 0.3)",
          shadowBlur: 10
        },
  barWidth: 32,
barMinHeight: 2,bottom: window.innerWidth < 640 ? "12%" : "10%",
barGap: "-100%",
barCategoryGap: "50%",
        label: {
          show: true,
          position: "top",
          color: "#3b82f6",
          fontSize: 11,
          fontWeight: "bold",
          formatter: (params) => params.value > 0 ? params.value : ''
        }
      }
    ]
  };

  // Click handler for the chart
  const handleChartClick = (params) => {
    if (!onBarClick) return;

    if (params.componentType === "series") {
      const index = params.dataIndex;
      const dayData = data[index];

      if (!dayData) return;

      const action = params.seriesName;

      let details = [];
      let count = 0;

      if (action === "Create") {
        details = dayData.createDetails || [];
        count = dayData.create || 0;
      } else if (action === "Update") {
        details = dayData.updateDetails || [];
        count = dayData.update || 0;
      }

      onBarClick({
        action: action,
        actionType: action.toLowerCase(),
        date: dayData.date,
        count: count,
        details: details
      });
    }
  };

  // Determine chart width for horizontal scrolling on mobile
 const getChartWidth = () => {
  if (data.length >= 7) {
    return `${data.length * 120}px`;
  }

  return "100%";
};

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading Chart...</div>}>
      <div
        ref={chartRef}
       className={`w-full ${
  isClientChart ||
  (window.innerWidth < 640 &&
    (isCreatedChart || isUpdatedChart))
    ? "overflow-x-auto overflow-y-hidden"
    : "h-full"
}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4a5568 #1a202c'
        }}
      >
        <ReactECharts
          option={option}
          onEvents={{
            click: handleChartClick
          }}
          style={{
         height: "320px",
            width: isClientChart
  ? `${data.length * 210}px`
  : getChartWidth(),
            minWidth: isClientChart
  ? `${data.length * 180}px`
  : window.innerWidth < 640
    ? "100%"
    : "auto"
          }}
        />
      </div>
    </Suspense>
  );
};

export default ActivityChart;