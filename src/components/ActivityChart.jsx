import React from "react";
import ReactECharts from "echarts-for-react";

const ActivityChart = ({ data, onBarClick }) => {

  const dates = data.map(item => item.date);
  const createData = data.map(item => item.create);
  const updateData = data.map(item => item.update);
  const deleteData = data.map(item => item.delete);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      axisPointer: { type: "shadow" },
      backgroundColor: "#111827",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: function (params) {
        if (!params) return "";

        const hoveredBar = params;
        
        const index = hoveredBar.dataIndex;
        const dayData = data[index];
        const action = hoveredBar.seriesName;
        const value = hoveredBar.value;
        
        if (!dayData) return "No data";
        
        let html = `<div style="font-weight:600;margin-bottom:8px;border-bottom:1px solid #374151;padding-bottom:4px">📅 ${dayData.date}</div>`;
        
        if (action === "Create") {
          html += `<div style="color:#22c55e;font-size:14px;margin-bottom:8px">
            <strong>✚ CREATE Activity</strong><br/>
            Total Today: <strong style="font-size:18px">${value}</strong>
          </div>`;
          
          if (dayData.createDetails && dayData.createDetails.length > 0) {
            html += `<hr style="margin:8px 0;border-color:#374151"/>`;
            html += `<div style="font-size:11px;color:#9ca3af;margin-bottom:6px">📋 Latest CREATE Activity:</div>`;
            const latest = dayData.createDetails[dayData.createDetails.length - 1];
            if (latest) {
              html += `
                <div style="font-size:12px;margin-top:6px;background:#1f2937;padding:8px;border-radius:6px;border-left:3px solid #22c55e">
                  <div>👤 <strong style="color:#22c55e">${latest.user || "System"}</strong></div>
                  <div>📄 ${latest.itemName || "Candidate"}</div>
                  <div>📦 Module: ${latest.module || "candidate"}</div>
                  <div>⏰ ${new Date(latest.time).toLocaleTimeString()}</div>
                </div>
              `;
            }
          } else {
            html += `<div style="font-size:12px;color:#6b7280;margin-top:8px;padding:8px;background:#1f2937;border-radius:6px">No create activities today</div>`;
          }
        }
        else if (action === "Update") {
          html += `<div style="color:#3b82f6;font-size:14px;margin-bottom:8px">
            <strong>✎ UPDATE Activity</strong><br/>
            Total Today: <strong style="font-size:18px">${value}</strong>
          </div>`;
          
          if (dayData.updateDetails && dayData.updateDetails.length > 0) {
            html += `<hr style="margin:8px 0;border-color:#374151"/>`;
            html += `<div style="font-size:11px;color:#9ca3af;margin-bottom:6px">📋 Latest UPDATE Activity:</div>`;
            const latest = dayData.updateDetails[dayData.updateDetails.length - 1];
            if (latest) {
              html += `
                <div style="font-size:12px;margin-top:6px;background:#1f2937;padding:8px;border-radius:6px;border-left:3px solid #3b82f6">
                  <div>👤 <strong style="color:#3b82f6">${latest.user || "System"}</strong></div>
                  <div>📄 ${latest.itemName || "Candidate"}</div>
                  <div>📦 Module: ${latest.module || "candidate"}</div>
                  <div>⏰ ${new Date(latest.time).toLocaleTimeString()}</div>
                </div>
              `;
            }
          } else {
            html += `<div style="font-size:12px;color:#6b7280;margin-top:8px;padding:8px;background:#1f2937;border-radius:6px">No update activities today</div>`;
          }
        }
        else if (action === "Delete") {
          html += `<div style="color:#ef4444;font-size:14px;margin-bottom:8px">
            <strong>🗑 DELETE Activity</strong><br/>
            Total Today: <strong style="font-size:18px">${value}</strong>
          </div>`;
          
          if (dayData.deleteDetails && dayData.deleteDetails.length > 0) {
            html += `<hr style="margin:8px 0;border-color:#374151"/>`;
            html += `<div style="font-size:11px;color:#9ca3af;margin-bottom:6px">📋 Latest DELETE Activity:</div>`;
            const latest = dayData.deleteDetails[dayData.deleteDetails.length - 1];
            if (latest) {
              html += `
                <div style="font-size:12px;margin-top:6px;background:#1f2937;padding:8px;border-radius:6px;border-left:3px solid #ef4444">
                  <div>👤 <strong style="color:#ef4444">${latest.user || "System"}</strong></div>
                  <div>📄 ${latest.itemName || "Candidate"}</div>
                  <div>📦 Module: ${latest.module || "candidate"}</div>
                  <div>⏰ ${new Date(latest.time).toLocaleTimeString()}</div>
                </div>
              `;
            }
          } else {
            html += `<div style="font-size:12px;color:#6b7280;margin-top:8px;padding:8px;background:#1f2937;border-radius:6px">No delete activities today</div>`;
          }
        }
        
        return html;
      }
    },
    // ✅ LEGEND REMOVED - Set to show: false
    legend: {
      show: false
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "8%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#444" } },
      axisLabel: { 
        color: "#ccc",
        rotate: dates.length > 7 ? 45 : 0,
        fontSize: 11
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      name: "Number of Activities",
      nameTextStyle: { color: "#aaa" },
      axisLine: { lineStyle: { color: "#444" } },
      splitLine: { lineStyle: { color: "#333", type: "dashed" } },
      axisLabel: { color: "#ccc" }
    },
    series: [
      {
        name: "Create",
        type: "bar",
        data: createData,
        itemStyle: { 
          color: "#22c55e",
          borderRadius: [4, 4, 0, 0],
          shadowColor: "rgba(34, 197, 94, 0.3)",
          shadowBlur: 10
        },
        barWidth: "10%",
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
        data: updateData,
        itemStyle: { 
          color: "#3b82f6",
          borderRadius: [4, 4, 0, 0],
          shadowColor: "rgba(59, 130, 246, 0.3)",
          shadowBlur: 10
        },
        barWidth: "10%",
        label: {
          show: true,
          position: "top",
          color: "#3b82f6",
          fontSize: 11,
          fontWeight: "bold",
          formatter: (params) => params.value > 0 ? params.value : ''
        }
      },
      {
        name: "Delete",
        type: "bar",
        data: deleteData,
        itemStyle: { 
          color: "#ef4444",
          borderRadius: [4, 4, 0, 0],
          shadowColor: "rgba(239, 68, 68, 0.3)",
          shadowBlur: 10
        },
        barWidth: "10%",
        label: {
          show: true,
          position: "top",
          color: "#ef4444",
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
      } else if (action === "Delete") {
        details = dayData.deleteDetails || [];
        count = dayData.delete || 0;
      }
      
      onBarClick({
        action: action,
        date: dayData.date,
        count: count,
        details: details
      });
    }
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "100%", width: "100%" }}
      onEvents={{
        click: handleChartClick
      }}
    />
  );
};

export default ActivityChart;