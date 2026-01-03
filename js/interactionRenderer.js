function createInteractionPlot(
  factorData,
  nameA,
  nameB,
  title,
  yUnit,
  containerId,
  config
) {
  const div = document.createElement("div");
  div.className = "chart-container";
  const plotId = "plotly-interaction-" + Date.now();

  // 優化：容器增加外邊距與陰影感，使其更像獨立報告
  div.style.margin = "40px 0";
  div.style.padding = "20px";
  div.style.background = "#fff";
  div.style.borderRadius = "8px";
  div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

  div.innerHTML = `
    <div id="${plotId}" class="plotly-graph-div"></div>
    <div style="text-align:center;margin:30px;" data-html2canvas-ignore="true">
      <button class="s" onclick="Plotly.downloadImage('${plotId}', {format: 'png', filename: '${title}_Interaction'})">
        下載圖片 (PNG)
      </button>
    </div>`;
  document.getElementById(containerId).appendChild(div);
  plotlyCharts.push(plotId);

  const levelsA = [...new Set(factorData.map((d) => d.f1))].sort();
  const levelsB = [...new Set(factorData.map((d) => d.f2))].sort();

  const isBold = config.useBold ? "bold" : "normal";
  const toBold = (t) => (config.useBold ? `<b>${t}</b>` : t);
  const mainFont = '"Microsoft JhengHei", "微軟正黑體", sans-serif';
  const numFont = '"Calibri", sans-serif';

  const traces = [];
  // 優化：使用一組專業的配色方案
  const interactionColors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
  ];

  levelsB.forEach((l2, idx) => {
    const yMeans = [];
    levelsA.forEach((l1) => {
      const cell = factorData.find((d) => d.f1 === l1 && d.f2 === l2);
      if (cell && cell.values.length > 0) {
        const mean =
          cell.values.reduce((a, b) => a + b, 0) / cell.values.length;
        yMeans.push(mean);
      } else {
        yMeans.push(null);
      }
    });

    traces.push({
      x: levelsA,
      y: yMeans,
      name: l2,
      mode: "lines+markers",
      type: "scatter",
      // 修正點：使用 idx % interactionColors.length 確保顏色循環使用
      line: {
        width: config.lineWidth + 1,
        shape: "linear",
        color: interactionColors[idx % interactionColors.length],
      },
      marker: {
        size: config.pointSize + 5,
        symbol: idx,
        color: interactionColors[idx % interactionColors.length], // 確保點與線顏色一致
        line: { width: 1, color: "white" },
      },
      connectgaps: true,
    });
  });

  const layout = {
    height: config.chartHeight,
    title: {
      text: toBold(`交互作用分析圖: ${nameA} × ${nameB}`),
      font: { size: config.titleFontSize, family: mainFont, color: "#1f4e78" },
      x: 0.5,
      xanchor: "center",
      y: 0.9, // ✨ 數值愈大愈靠頂部
      yanchor: "bottom", // 確保標題底部與圖表拉開距離
    },
    showlegend: true,
    // 3. 調整因子 B (圖例) 的位置
    legend: {
      title: {
        text: toBold(`  ${nameB}  `), // 增加空格讓標題不擁擠
        font: {
          size: config.fontSize + 4,
          family: mainFont,
          color: "#1f4e78", // 使用深藍色增加層次感
        },
      },
      font: {
        size: config.fontSize + 2,
        family: mainFont,
        color: "#333",
      },
      // --- 排版位置調整 ---
      x: 1.05, // 移出圖表右側，數值越高越靠右
      y: 1, // 對齊圖表頂端
      xanchor: "left",
      yanchor: "top",

      // --- 視覺美化 ---
      bgcolor: "rgba(255, 255, 255, 0.9)", // 半透明白色背景
      bordercolor: "#cfd8dc", // 淺灰色細邊框
      borderwidth: 1,
      itemwidth: 50, // 增加圖例項目的寬度
      itemsizing: "constant", // 保持符號大小一致
      valign: "middle", // 文字與符號垂直居中
      traceorder: "normal",
    },
    xaxis: {
      title: {
        // 4. 調整因子 A (X 軸標題) 的位置
        text: toBold(nameA),
        font: { size: config.fontSize + 4, family: mainFont },
        standoff: 10, // ✨ 增加數值可讓「因子 A」文字更往下移，不擠在軸線旁
      },
      tickfont: { size: config.fontSize, family: numFont, weight: isBold },
      linecolor: "#333",
      linewidth: 2,
      mirror: true,
      gridcolor: "#f0f0f0",
    },
    yaxis: {
      title: {
        text: toBold(yUnit),
        font: { size: config.fontSize + 4, family: mainFont },
        standoff: 30, // ✨ 增加數值可讓 Y 軸單位向左移，不擠在軸線旁
      },
      tickfont: { size: config.fontSize, family: numFont, weight: isBold },
      linecolor: "#333",
      linewidth: 2,
      mirror: true,
      gridcolor: "#e0e0e0",
    },
    margin: { t: 120, b: 100, l: 140, r: 140 }, // 增加右側邊距給圖例
    paper_bgcolor: "#FFFFFF",
    plot_bgcolor: "#FCFCFC",
    hovermode: "x unified",
  };

  Plotly.newPlot(plotId, traces, layout, {
    responsive: true,
    displayModeBar: false,
  });
}
