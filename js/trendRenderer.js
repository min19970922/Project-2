/**
 * trendRenderer.js - 負責折線、柱狀、混合圖、點圖
 */
function createPlotlyTrendChart(
  activeGroups,
  title,
  yUnitLeft,
  yUnitRight,
  containerId,
  mode,
  config
) {
  const {
    fontSize,
    lineWidth,
    pointSize,
    chartHeight,
    useBold,
    titleFontSize,
    colors,
    boxGap, // 取得面板中的「盒鬚間距」數值
  } = config;

  const div = document.createElement("div");
  div.className = "chart-container";
  const plotId = "plotly-trend-" + Date.now();

  div.innerHTML = `<div id="${plotId}" class="plotly-graph-div"></div><div style="text-align:center;margin:30px;" data-html2canvas-ignore="true"><button class="s" onclick="Plotly.downloadImage('${plotId}', {format: 'png', filename: '${title}'})">下載圖片</button></div>`;
  document.getElementById(containerId).appendChild(div);
  plotlyCharts.push(plotId);

  const traces = [];
  let useRightAxis = false;
  const toBold = (t) => (useBold ? `<b>${t}</b>` : t);
  const showGrid = document.getElementById("showGrid")?.checked ?? true;

  // 取得 X 軸標籤
  const labels = columnsData.find((c) => c.isSequence)?.values || [];

  activeGroups.forEach((group, i) => {
    const sName = group.name || "";
    const isLineTrigger = sName.toLowerCase().endsWith("-line");

    let trace = {
      x: labels,
      y: group.values,
      name: toBold(sName.replace(/-line/i, "")),
      marker: {
        color: group.color || colors[i % colors.length],
        size: pointSize + 2,
      },
      line: {
        width: lineWidth, // 藉由「線條寬度」控制折線
        shape: "linear",
      },
    };

    // 判斷繪圖模式
    if (mode === "line" || (mode === "mixed" && isLineTrigger)) {
      trace.type = "scatter";
      trace.mode = "lines+markers";
      if (mode === "mixed") {
        trace.yaxis = "y2"; // 混合模式下 -line 結尾的數據掛載到右軸
        useRightAxis = true;
      }
    } else {
      trace.type = "bar";
      trace.yaxis = "y";
    }
    traces.push(trace);
  });

  const layout = {
    height: chartHeight,
    bargap: boxGap, // 關鍵：使用「盒鬚間距」控制柱狀圖的寬度 (數值越大柱子越細)
    title: {
      text: toBold(title), // 僅顯示主標題，移除模式括號
      font: { size: titleFontSize, family: "Microsoft JhengHei" },
      x: 0.5,
      xanchor: "center",
    },
    font: {
      family: 'Calibri, "Microsoft JhengHei", sans-serif',
      size: fontSize,
      weight: useBold ? "bold" : "normal",
    },
    hovermode: "x unified",
    showlegend: true,
    legend: { orientation: "h", y: -0.15, x: 0.5, xanchor: "center" },
    plot_bgcolor: "white",
    paper_bgcolor: "#F7F7F7",
    margin: { t: 130, b: 100, l: 100, r: 100 },
    xaxis: {
      showgrid: false,
      showline: true,
      mirror: true,
      linecolor: "#333",
      linewidth: lineWidth,
      tickfont: { size: fontSize, weight: useBold ? "bold" : "normal" },
    },
    yaxis: {
      showgrid: showGrid,
      gridcolor: "#888888",
      zeroline: false,
      showline: true,
      mirror: useRightAxis ? false : true,
      linecolor: "#333",
      linewidth: lineWidth,
      tickfont: { size: fontSize, weight: useBold ? "bold" : "normal" },
    },
    annotations: [
      {
        xref: "paper",
        yref: "paper",
        x: -0.005,
        y: 1.05,
        xanchor: "right",
        yanchor: "bottom",
        text: toBold(yUnitLeft),
        showarrow: false,
        font: { size: fontSize + 2 },
      },
    ],
  };

  if (useRightAxis) {
    layout.yaxis2 = {
      showgrid: false,
      overlaying: "y",
      side: "right",
      showline: true,
      linecolor: "#333",
      linewidth: lineWidth, // 建議改為變數
      zeroline: false,
      tickfont: { size: fontSize, weight: useBold ? "bold" : "normal" },
    };

    // 右側 Y 軸單位：顯示於右側數字上方
    layout.annotations.push({
      xref: "paper",
      yref: "paper",
      x: 1.005,
      y: 1.05,
      xanchor: "left",
      yanchor: "bottom",
      text: toBold(yUnitRight),
      showarrow: false,
      font: { size: fontSize + 2 },
    });
  }

  Plotly.newPlot(plotId, traces, layout, {
    responsive: true,
    displayModeBar: false,
  });
}

function createClassicDotPlot(
  groupData,
  colors,
  title,
  yUnit,
  container,
  fontSize,
  step,
  showGrid,
  lineWidth,
  useBold,
  chartHeight,
  titleFontSize
) {
  const div = document.createElement("div");
  div.className = "chart-container";
  const plotId = "plotly-dot-" + Date.now();
  div.innerHTML = `<div id="${plotId}" class="plotly-graph-div"></div><div style="text-align:center;margin:30px;"><button class="s" onclick="Plotly.downloadImage('${plotId}', {format: 'png', filename: '${title}'})">下載圖片</button></div>`;
  container.appendChild(div);
  plotlyCharts.push(plotId);

  const pointSize =
    (parseInt(document.getElementById("pointSize").value) || 5) * 2;
  const traces = [];
  const annotations = [];
  const shapes = [];
  let currentY = pointSize * 1.5;

  const toBold = (t) => (useBold ? "<b>" + t + "</b>" : t);

  const ctx = document.createElement("canvas").getContext("2d");
  const labelFont =
    (useBold ? "bold " : "") +
    fontSize +
    "px 'Microsoft JhengHei', 'Calibri', sans-serif";
  ctx.font = labelFont;

  let maxLabelWidth = 0;
  groupData.forEach((g) => {
    const width = ctx.measureText(g.label).width;
    if (width > maxLabelWidth) maxLabelWidth = width;
  });
  const dynamicLeftMargin = Math.max(150, maxLabelWidth + 40);

  // 2. 計算底部邊界 (X軸標題 + 數字)
  const titleHeight = fontSize + 12;
  const tickHeight = fontSize + 6;
  const dynamicBottomMargin = titleHeight + tickHeight + 40;
  const dynamicTopMargin = (fontSize + 20) * 1.8;

  groupData.forEach((g, i) => {
    const vals = g.values
      .filter((v) => v !== null && !isNaN(v))
      .sort((a, b) => a - b);
    const counts = {};
    const xList = [];
    const yList = [];
    vals.forEach((v) => {
      let pv = step ? Math.round(v / step) * step : v;
      const k = String(pv);
      counts[k] = (counts[k] || 0) + 1;
      xList.push(pv);
      yList.push(currentY + (counts[k] - 1) * pointSize * 1.1);
    });
    const h = Math.max(
      Math.max(...Object.values(counts), 0) * pointSize * 1.1,
      pointSize * 3
    );

    traces.push({
      x: xList,
      y: yList,
      mode: "markers",
      type: "scatter",
      marker: {
        color: colors[i],
        size: pointSize,
        line: { width: 1, color: "white" },
      },
      hoverinfo: "x+name",
      name: g.label,
    });

    let cleanLabel = String(g.label)
      .replace(/[\{\｛].+?[\}\｝]/g, "")
      .trim();

    annotations.push({
      x: 0,
      xref: "paper",
      xanchor: "right",
      xshift: -10,
      y: currentY + h / 2 - pointSize,
      text: toBold(cleanLabel), // <-- 使用 cleanLabel
      showarrow: false,
      font: {
        family: '"Microsoft JhengHei", "Calibri", sans-serif',
        size: fontSize,
        color: "black",
        weight: useBold ? "bold" : "normal",
      },
    });

    if (i < groupData.length - 1) {
      const ly = currentY + h + pointSize;
      shapes.push({
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: ly,
        y1: ly,
        line: { color: "#ccc", width: 1 },
      });

      currentY = ly + pointSize * 1.5;
    } else {
      currentY += h;
    }
  });

  Plotly.newPlot(
    plotId,
    traces,
    {
      height: chartHeight,
      font: { family: '"Microsoft JhengHei", "Calibri", sans-serif' },
      title: {
        text: toBold(title),
        font: { size: titleFontSize },
        y: 0.96,
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        range: [0, currentY],
        fixedrange: true,
        showline: true,
        mirror: true,
        linecolor: "black",
        linewidth: lineWidth,
      },
      xaxis: {
        automargin: true,
        title: { text: toBold(yUnit), font: { size: fontSize + 12 } },
        zeroline: false,
        showline: true,
        mirror: true,
        linecolor: "black",
        linewidth: lineWidth,
        showgrid: showGrid,
        gridcolor: showGrid ? "#aaa" : "rgba(0,0,0,0)",
        tickprefix: useBold ? "<b>" : "",
        ticksuffix: useBold ? "</b>" : "",
        tickfont: {
          size: fontSize + 6,
          family: '"Microsoft JhengHei", "Calibri", sans-serif',
          weight: useBold ? "bold" : "normal",
        },
      },
      annotations: annotations,
      shapes: shapes,
      showlegend: false,
      margin: {
        l: dynamicLeftMargin,
        r: 50,
        t: dynamicTopMargin,
        b: dynamicBottomMargin,
      },
      paper_bgcolor: "#F7F7F7",
      plot_bgcolor: "white",
    },
    { responsive: true, displayModeBar: false }
  );
}
