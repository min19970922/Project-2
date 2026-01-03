let capChartInstances = [];
let plotlyCharts = [];

function calculateStatistics(allDataFlat, subgroups) {
  if (!allDataFlat || allDataFlat.length < 2) return null;
  const n = allDataFlat.length;
  const mean = allDataFlat.reduce((a, b) => a + b, 0) / n;
  const varianceOverall =
    allDataFlat.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const stdOverall = Math.sqrt(varianceOverall);
  let stdWithin = 0;
  let method = "";
  const isSingleValue = subgroups.every((g) => g.length === 1);
  const methodSetting =
    document.getElementById("stdDevMethod")?.value || "pooled";

  if (isSingleValue) {
    let sumMR = 0;
    let countMR = 0;
    for (let i = 1; i < allDataFlat.length; i++) {
      sumMR += Math.abs(allDataFlat[i] - allDataFlat[i - 1]);
      countMR++;
    }
    stdWithin = sumMR / countMR / 1.128;
    method = "MR/d2 (I-MR)";
  } else {
    if (methodSetting === "rbar") {
      let sumR = 0;
      let validGroups = 0;
      subgroups.forEach((g) => {
        if (g.length > 1) {
          sumR += Math.max(...g) - Math.min(...g);
          validGroups++;
        }
      });
      if (validGroups > 0) {
        const avgSize = Math.round(n / subgroups.length);
        const d2_val = getD2(avgSize);
        stdWithin = sumR / validGroups / (d2_val > 0 ? d2_val : 1);
        method = "R-Bar";
      } else {
        stdWithin = stdOverall;
        method = "R-Bar (Fail)";
      }
    } else if (methodSetting === "sbar") {
      let sumS = 0;
      let validGroups = 0;
      subgroups.forEach((g) => {
        if (g.length > 1) {
          const m = g.reduce((a, b) => a + b, 0) / g.length;
          const v =
            g.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (g.length - 1);
          sumS += Math.sqrt(v);
          validGroups++;
        }
      });
      if (validGroups > 0) {
        const avgSize = Math.round(n / subgroups.length);
        const c4_val = getC4(avgSize);
        stdWithin = sumS / validGroups / (c4_val > 0 ? c4_val : 1);
        method = "S-Bar";
      } else {
        stdWithin = stdOverall;
        method = "S-Bar (Fail)";
      }
    } else {
      let sumNiMinus1SiSq = 0;
      let sumDf = 0;
      subgroups.forEach((g) => {
        if (g.length > 1) {
          const m = g.reduce((a, b) => a + b, 0) / g.length;
          sumNiMinus1SiSq += g.reduce((a, b) => a + Math.pow(b - m, 2), 0);
          sumDf += g.length - 1;
        }
      });
      if (sumDf > 0) {
        const pooledStd = Math.sqrt(sumNiMinus1SiSq / sumDf);
        const c4_val = getC4(sumDf + 1);
        stdWithin = pooledStd / (c4_val > 0 ? c4_val : 1);
        method = "Pooled SD";
      } else {
        stdWithin = stdOverall;
        method = "Pooled (Fail)";
      }
    }
  }
  const normStats = calculateNormality(allDataFlat, mean, stdOverall, n);
  return { n, mean, stdOverall, stdWithin, normStats, method };
}

function calculateNormality(data, mean, std, n) {
  let skewness =
    (n * data.reduce((acc, val) => acc + Math.pow(val - mean, 3), 0)) /
    ((n - 1) * (n - 2) * Math.pow(std, 3));
  let kurtosis =
    (n *
      (n + 1) *
      data.reduce((acc, val) => acc + Math.pow(val - mean, 4), 0)) /
      ((n - 1) * (n - 2) * (n - 3) * Math.pow(std, 4)) -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  let skText =
    Math.abs(skewness) < 0.5 ? "對稱" : skewness > 0 ? "右偏" : "左偏";
  let kuText =
    Math.abs(kurtosis) < 0.5 ? "常態" : kurtosis > 0 ? "高峻" : "低平";
  let isNormal = Math.abs(skewness) < 1.0 && Math.abs(kurtosis) < 2.0;
  return { skewness, kurtosis, skText, kuText, isNormal };
}

function calculateBinWidth(data) {
  const n = data.length;
  if (n < 2) return 1;
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  if (iqr === 0) return (sorted[n - 1] - sorted[0]) / 10 || 1;
  return 2 * iqr * Math.pow(n, -1 / 3);
}

function deleteOutlierPoint(groupIndexOrName, value) {
  // 1. 透過名稱找到對應的數據欄位索引
  let colIndex = columnsData.findIndex((c) => c.name === groupIndexOrName);

  if (colIndex > -1 && columnsData[colIndex]) {
    const arr = columnsData[colIndex].values;
    let idxToRemove = -1;

    // 2. 設定極小誤差範圍比對數值，找出原始數據中的點
    let minDiff = 0.000001;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== null && Math.abs(arr[i] - value) < minDiff) {
        idxToRemove = i;
        break;
      }
    }

    // 3. 從原始數據中剔除並觸發全局重新計算 (這會更新統計報告與圖表)
    if (idxToRemove > -1) {
      columnsData[colIndex].values.splice(idxToRemove, 1);
      renderTable(); // 更新左側表格
      go(); // 重新執行統計計算與繪圖
    }
  }
}

function createPlotlyBoxChart(
  analysisResult, // ✨ 接收由 main.js 傳入的統一結果
  boxDataArray, // ✨ 抽樣數據 (繪圖用)
  groupNames,
  colors,
  title,
  yUnit,
  containerId,
  fontSize,
  lineWidth,
  pointSize,
  yMin,
  yMax,
  yStep,
  extremeXOffset,
  meanMedianXOffset,
  showOutliers,
  showAllPoints,
  statFontSize,
  chartHeight,
  boxGap,
  titleFontSize
) {
  const parentContainer = document.getElementById(containerId);
  if (!parentContainer) return;

  const div = document.createElement("div");
  div.className = "chart-container";
  const plotId = "plotly-box-" + Date.now();

  const showMean = document.getElementById("showMean")?.checked ?? false;
  const showMedian = document.getElementById("showMedian")?.checked ?? false;
  const showExtremes =
    document.getElementById("showExtremes")?.checked ?? false;
  const useBold = document.getElementById("useBoldFont")?.checked ?? false;
  const showPValueCheckbox =
    document.getElementById("showPValue")?.checked ?? false;
  const specLSL = parseFloat(document.getElementById("specLSL").value);
  const specUSL = parseFloat(document.getElementById("specUSL").value);
  const specTarget = parseFloat(document.getElementById("specTarget").value);
  const specLineColor =
    document.getElementById("specLineColor").value || "#e74c3c";
  const specLineStyle =
    document.getElementById("specLineStyle").value || "solid";

  // --- 1. 使用外部傳入的 analysisResult 生成摘要框 (與下方報告同步) ---
  let statsHeaderBoxHtml = "";

  if (showPValueCheckbox && analysisResult && analysisResult.data) {
    const d = analysisResult.data;
    const isSig = d.p < 0.05;
    const pValStr = d.p < 0.0001 ? "0.00000" : d.p.toFixed(5);

    let methodDisplay = analysisResult.type;
    if (methodDisplay === "ANOVA") {
      methodDisplay = d.method === "Welch" ? "Welch's ANOVA" : "One-way ANOVA";
    } else if (methodDisplay === "INDEPENDENT_T") {
      methodDisplay = "Independent T";
    } else {
      methodDisplay = methodDisplay.replace("_", " ");
    }

    statsHeaderBoxHtml = `
      <div style="border: 2px solid #2980b9; border-radius: 8px; padding: 10px 15px; 
                  background: #ffffff; font-family: 'Calibri', sans-serif; 
                  width: fit-content; white-space: nowrap;
                  margin-top: -45px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); pointer-events: none;">
          <div style="font-weight:bold; color:#1f4e78; border-bottom:2px solid #2980b9; margin-bottom:6px; font-size:${Math.round(
            statFontSize * 0.9
          )}px;">
              ${methodDisplay}
          </div>
          <table style="width: 100%; font-size: ${
            statFontSize * 0.8
          }px; border-collapse: collapse; line-height: 0.9;">
              <tr><td style="color:#666; padding-right:20px;">P-Value</td>
                  <td style="text-align:right; font-weight:bold; color:${
                    isSig ? "#c0392b" : "#2ecc71"
                  }">${pValStr}</td></tr>
              <tr><td style="color:#666;">Stat</td>
                  <td style="text-align:right;">${(d.F || d.t || 0).toFixed(
                    3
                  )}</td></tr>
              <tr><td style="color:#666;">df</td>
                  <td style="text-align:right;">${
                    d.df2
                      ? `${d.df1.toFixed(0)}, ${d.df2.toFixed(1)}`
                      : d.df
                      ? d.df.toFixed(1)
                      : "---"
                  }</td></tr>
          </table>
      </div>`;
  }

  // --- 2. 判斷圖例邏輯 ---
  let hasSlash = groupNames.some((name) => String(name).includes("\\"));
  let legendItemsHtml = "";
  if (hasSlash) {
    const groupOrder = [];
    const groupLabels = {};
    groupNames.forEach((name, i) => {
      const gName = String(name).split("\\")[0].trim();
      if (!groupLabels[gName]) {
        groupOrder.push(gName);
        groupLabels[gName] = colors[i];
      }
    });

    legendItemsHtml = groupOrder
      .map(
        (g) => `
      <div style="display: flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 2px 0;">
        <span style="display: inline-block; width: 14px; height: 14px; background: ${
          groupLabels[g]
        }; border-radius: 3px; border: 1px solid #666; flex-shrink: 0;"></span>
        <span style="font-size: ${fontSize * 0.75}px; font-weight: ${
          useBold ? "bold" : "normal"
        }; white-space: nowrap; font-family: 'Microsoft JhengHei', 'Calibri', sans-serif;">${g}</span>
      </div>`
      )
      .join("");
  }

  // --- 3. 生成排版 HTML (應用您要求的 CSS 邏輯) ---
  div.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-top: 25px; margin-bottom: 15px; width: 100%;">
      <div style="padding-left: 20px; display: flex; justify-content: flex-start;">${statsHeaderBoxHtml}</div>
      <h2 style="margin: 0; padding: 0 20px;font-size: ${titleFontSize}px; text-align: center; white-space: nowrap; font-weight: ${
    useBold ? "bold" : "normal"
  }; font-family: 'Microsoft JhengHei';">${title}</h2>
      
      <div style="display: flex; 
                  flex-wrap: wrap; 
                  justify-content: flex-start; 
                  align-content: flex-start;
                  gap: 8px 15px; 
                  justify-self: end; 
                  width: auto; 
                  max-width: 500px; 
                  padding-right: 100px; 
                  padding-top: 20px;
                  box-sizing: border-box;">
          ${legendItemsHtml}
      </div>
    </div>
    <div id="${plotId}" class="plotly-graph-div" style="height:${chartHeight}px;"></div>
    <div style="text-align:center;margin:30px;" data-html2canvas-ignore="true">
      <button class="s" onclick="downloadBoxChartWithHeader(this, '${title}')">下載圖片</button>
    </div>`;

  parentContainer.appendChild(div);
  plotlyCharts.push(plotId);

  const shapes = [];
  const annotations = [];
  const specLineDash = specLineStyle === "dashed" ? "dash" : "solid";
  const toBold = (text) => (useBold ? `<b>${text}</b>` : text);

  const addSpecMarker = (val, label, color) => {
    if (isNaN(val)) return;
    shapes.push({
      type: "line",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: val,
      y1: val,
      line: {
        color: color,
        width: lineWidth,
        dash: label === "Target" ? "dot" : specLineDash,
      },
      layer: "above",
    });
    annotations.push({
      x: 1,
      xref: "paper",
      y: val,
      yref: "y",
      text: toBold(label),
      showarrow: false,
      xanchor: "left",
      xshift: 10,
      font: {
        family: "Calibri",
        size: fontSize,
        color: color,
        weight: useBold ? "bold" : "normal",
      },
    });
  };
  addSpecMarker(specLSL, "LSL", specLineColor);
  addSpecMarker(specUSL, "USL", specLineColor);
  addSpecMarker(specTarget, "Target", "#27ae60");

  // --- 5. 關鍵修正：計算 Y 軸範圍 (解決貼緊問題) ---
  const allPoints = boxDataArray.flat().filter((v) => v !== null && !isNaN(v));
  let dMin = allPoints.length > 0 ? Math.min(...allPoints) : 0;
  let dMax = allPoints.length > 0 ? Math.max(...allPoints) : 100;

  if (!isNaN(specLSL)) dMin = Math.min(dMin, specLSL);
  if (!isNaN(specUSL)) dMax = Math.max(dMax, specUSL);
  if (!isNaN(specTarget)) {
    dMin = Math.min(dMin, specTarget);
    dMax = Math.max(dMax, specTarget);
  }

  // ✨ 確保 yMin / yMax 為數值，避免運算產生 NaN
  const parsedYMin = yMin !== null ? parseFloat(yMin) : null;
  const parsedYMax = yMax !== null ? parseFloat(yMax) : null;

  const autoBuffer = (dMax - dMin) * 0.1; // 保持 10% 緩衝空間
  const finalYMin =
    parsedYMin === null ? dMin - autoBuffer : parsedYMin - autoBuffer;
  const finalYMax =
    parsedYMax === null ? dMax + autoBuffer : parsedYMax + autoBuffer;

  // --- 6. 生成數據 Trace 與標註 ---
  const traces = [];
  const safeFmt = (val) =>
    val === undefined || isNaN(val) ? "N/A" : Number(val).toFixed(2);

  groupNames.forEach((name, i) => {
    const yData = boxDataArray[i]
      ? boxDataArray[i].filter((v) => v !== null && !isNaN(v))
      : [];
    if (yData.length === 0) return;

    const boxPointsMode = showAllPoints
      ? "all"
      : showOutliers
      ? "outliers"
      : false;

    const currentJitter = showAllPoints ? 0.3 : 0;
    const currentPointPos = showAllPoints ? -1.8 : 0;

    traces.push({
      y: yData,
      x: yData.map(() => i),
      type: "box",
      name: toBold(String(name)),
      boxpoints: boxPointsMode,
      jitter: currentJitter, // ✨ 只有顯示所有點時才散開，離群值模式下為 0
      pointpos: currentPointPos, // ✨ 只有顯示所有點時才偏移，離群值模式下為 0
      marker: {
        color: colors[i],
        size: pointSize + 3,
        line: { width: 1, color: "#ffffff" }, // 增加白色邊框讓離群值更清晰
      },
      line: { width: lineWidth },
      fillcolor: colors[i] + "33",
    });

    // B. 建立統計標註 (Annotations)
    const sortedY = [...yData].sort((a, b) => a - b);
    const meanV = jStat.mean(yData);
    const medV = jStat.median(yData);

    const createLabel = (val, prefix, xShift, color, isEx = false) => ({
      x: i,
      y: val,
      text: toBold(prefix + safeFmt(val)),
      showarrow: false,
      xanchor: "left",
      yanchor: "middle",
      xshift: isEx ? extremeXOffset : meanMedianXOffset + xShift,
      font: {
        family: "Calibri",
        size: statFontSize,
        color: color,
        weight: useBold ? "bold" : "normal",
      },
    });

    if (showMean) annotations.push(createLabel(meanV, "  ", 15, "#000000"));
    if (showMedian) {
      annotations.push(
        createLabel(
          medV,
          "  ",
          (showMean ? statFontSize * 3.5 : 0) + 15,
          "#000000"
        )
      );
    }
    if (showExtremes) {
      annotations.push(
        createLabel(sortedY[sortedY.length - 1], "↑ ", 0, "#e74c3c", true)
      );
      annotations.push(createLabel(sortedY[0], "↓ ", 0, "#27ae60", true));
    }
  });

  Plotly.newPlot(
    plotId,
    traces,
    {
      height: chartHeight,
      boxgap: boxGap,
      shapes: shapes,
      font: { family: '"Microsoft JhengHei", Calibri' },
      margin: { l: 150, r: 100, t: 30, b: 80 },
      paper_bgcolor: "#F7F7F7",
      plot_bgcolor: "white",
      yaxis: {
        title: {
          text: toBold(yUnit),
          font: { size: fontSize + 12 },
          standoff: -10,
        },
        range: [finalYMin, finalYMax],
        showline: true,
        mirror: true,
        ticks: "outside",
        tickwidth: lineWidth,
        linewidth: lineWidth,
        gridcolor: document.getElementById("showGrid")?.checked
          ? "#aaa"
          : "rgba(0,0,0,0)",
        dtick: yStep || undefined,
        tickprefix: useBold ? "<b>" : "",
        ticksuffix: useBold ? "</b>" : "",
        tickfont: {
          size: fontSize + 6,
          family: 'Calibri, "Microsoft JhengHei", sans-serif',
          weight: useBold ? "bold" : "normal",
        },
        zeroline: false,
      },
      xaxis: {
        showline: true,
        mirror: true,
        linewidth: lineWidth,
        tickmode: "array",
        tickvals: groupNames.map((_, i) => i),
        ticktext: groupNames.map((n) =>
          toBold(
            String(n)
              .split("\\")
              .pop()
              .replace(/[\{\｛].+?[\}\｝]/g, "")
              .trim()
          )
        ),
        tickfont: { size: fontSize, weight: useBold ? "bold" : "normal" },
        automargin: true,
      },
      annotations: annotations,
      showlegend: false,
    },
    { responsive: true, displayModeBar: false }
  ).then((p) => {
    p.on("plotly_click", (data) => {
      if (data.points.length > 0) {
        lastClickedPoint = {
          groupName: groupNames[data.points[0].x],
          value: data.points[0].y,
        };
      }
    });
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

function renderCapabilityReport(
  container,
  allDataFlat,
  subgroups,
  titleName,
  config
) {
  const { LSL, USL, Target, fontBaseSize, lineWidth, step } = config;
  const useBold = document.getElementById("useBoldFont")?.checked ?? false;
  const hasLSL = !isNaN(LSL);
  const hasUSL = !isNaN(USL);
  const hasTarget = !isNaN(Target);

  if (!hasLSL && !hasUSL) {
    const errDiv = document.createElement("div");
    errDiv.className = "cp-report-wrapper";
    errDiv.style.textAlign = "center";
    errDiv.innerHTML = `<h3 style="color:red;">無法產生 ${titleName} 的製程能力報告：請至少輸入 LSL 或 USL。</h3>`;
    container.appendChild(errDiv);
    return;
  }

  const stats = calculateStatistics(allDataFlat, subgroups);
  if (!stats) return;
  const { n, mean, stdOverall, stdWithin, normStats, method } = stats;
  const fmt = (v) =>
    v === undefined || isNaN(v) || !isFinite(v) ? "—" : v.toFixed(2);
  const fmtBig = (v) => (v === undefined || isNaN(v) ? "—" : v.toFixed(5));

  let Pp = hasLSL && hasUSL ? (USL - LSL) / (6 * stdOverall) : NaN;
  let Cp = hasLSL && hasUSL ? (USL - LSL) / (6 * stdWithin) : NaN;
  let Cpu = hasUSL ? (USL - mean) / (3 * stdWithin) : NaN;
  let Cpl = hasLSL ? (mean - LSL) / (3 * stdWithin) : NaN;
  let Cpk = Math.min(...[Cpu, Cpl].filter((x) => !isNaN(x)));
  let Ppu = hasUSL ? (USL - mean) / (3 * stdOverall) : NaN;
  let Ppl = hasLSL ? (mean - LSL) / (3 * stdOverall) : NaN;
  let Ppk = Math.min(...[Ppu, Ppl].filter((x) => !isNaN(x)));
  let Cpm = NaN;
  if (hasLSL && hasUSL && hasTarget) {
    const tau = Math.sqrt(Math.pow(stdOverall, 2) + Math.pow(mean - Target, 2));
    Cpm = (USL - LSL) / (6 * tau);
  }

  let ppm_w_low = hasLSL ? normalCDF((LSL - mean) / stdWithin) * 1e6 : 0;
  let ppm_w_high = hasUSL ? normalCDF((mean - USL) / stdWithin) * 1e6 : 0;
  let ppm_o_low = hasLSL ? normalCDF((LSL - mean) / stdOverall) * 1e6 : 0;
  let ppm_o_high = hasUSL ? normalCDF((mean - USL) / stdOverall) * 1e6 : 0;
  let obs_low = hasLSL ? allDataFlat.filter((x) => x < LSL).length : 0;
  let obs_high = hasUSL ? allDataFlat.filter((x) => x > USL).length : 0;

  let Z_bench_w = invNormalCDF(1 - (ppm_w_low + ppm_w_high) / 1e6);
  let Z_bench_o = invNormalCDF(1 - (ppm_o_low + ppm_o_high) / 1e6);

  const wrapper = document.createElement("div");
  wrapper.className = "cp-report-wrapper";
  const contentFontSize = Math.max(12, fontBaseSize * 0.8);
  const titleFontSize = Math.max(16, fontBaseSize * 1.5);
  wrapper.style.fontSize = contentFontSize + "px";
  const valClass = useBold ? "cp-value bold" : "cp-value";
  const labelClass = useBold ? "cp-label bold" : "cp-label";

  wrapper.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #2c3e50; padding-bottom:10px; margin-bottom:10px;">
                    <h2 style="margin:0; font-family:'Microsoft JhengHei'; font-size:${titleFontSize}px;">${titleName}</h2>
                    <div style="text-align:right; font-size:${
                      contentFontSize * 0.85
                    }px; color:#555;">
                        Sigma: <b>${method}</b><br>
                        常態性: <span class="${
                          normStats.isNormal ? "status-ok" : "status-warn"
                        }">${normStats.skText} / ${normStats.kuText}</span>
                    </div>
                </div>
                <div class="cp-grid-container">
                    <div class="cp-col">
                        <div class="cp-box">
                            <div class="cp-header">過程數據</div>
                            <div class="cp-row"><span class="${labelClass}">LSL</span><span class="${valClass}">${
    hasLSL ? LSL : "*"
  }</span></div>
                            <div class="cp-row"><span class="${labelClass}">Target</span><span class="${valClass}" style="color:#27ae60;">${
    hasTarget ? Target : "*"
  }</span></div>
                            <div class="cp-row"><span class="${labelClass}">USL</span><span class="${valClass}">${
    hasUSL ? USL : "*"
  }</span></div>
                            <div class="cp-row"><span class="${labelClass}">均值</span><span class="${valClass}">${mean.toFixed(
    4
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">N</span><span class="${valClass}">${n}</span></div>
                            <div class="cp-row"><span class="${labelClass}">SD(組內)</span><span class="${valClass}">${fmtBig(
    stdWithin
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">SD(整體)</span><span class="${valClass}">${fmtBig(
    stdOverall
  )}</span></div>
                        </div>
                        <div class="cp-box">
                            <div class="cp-header">整體能力</div>
                            <div class="cp-row"><span class="${labelClass}">Pp</span><span class="${valClass}">${fmt(
    Pp
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">Ppk</span><span class="${valClass}">${fmt(
    Ppk
  )}</span></div>
                            <div class="cp-row" style="background:#e8f6f3;"><span class="${labelClass}">Cpm</span><span class="${valClass}">${fmt(
    Cpm
  )}</span></div>
                        </div>
                    </div>
                    <div class="cp-col">
                        <div class="cp-chart-area"><canvas></canvas></div>
                    </div>
                    <div class="cp-col">
                         <div class="cp-box">
                            <div style="display:flex; gap:5px; align-items:center; justify-content:center; padding:2px;">
                                <span style="color:#c0392b; font-weight:bold;">—</span> 組內
                                <span style="color:#2c3e50; font-weight:bold; border-bottom:2px dashed #2c3e50; height:10px; display:inline-block; width:20px; margin-left:5px;"></span> 整體
                            </div>
                        </div>
                        <div class="cp-box">
                            <div class="cp-header">潛在(組內)能力</div>
                            <div class="cp-row"><span class="${labelClass}">Cp</span><span class="${valClass}">${fmt(
    Cp
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">CPL</span><span class="${valClass}">${fmt(
    Cpl
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">CPU</span><span class="${valClass}">${fmt(
    Cpu
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">Cpk</span><span class="${valClass}">${fmt(
    Cpk
  )}</span></div>
                        </div>
                        <div class="cp-box">
                            <div class="cp-header">Z-Score (Sigma)</div>
                            <div class="cp-row"><span class="${labelClass}">Z.Bench(W)</span><span class="${valClass}">${fmt(
    Z_bench_w
  )}</span></div>
                            <div class="cp-row"><span class="${labelClass}">Z.Bench(O)</span><span class="${valClass}">${fmt(
    Z_bench_o
  )}</span></div>
                        </div>
                    </div>
                </div>
                <div class="cp-bottom-grid">
                    <div class="cp-box">
                        <div class="cp-header">實測性能 (Observed)</div>
                        <div class="cp-row"><span class="${labelClass}">PPM < LSL</span><span class="${valClass}">${(
    (obs_low / n) *
    1e6
  ).toFixed(2)}</span></div>
                        <div class="cp-row"><span class="${labelClass}">PPM > USL</span><span class="${valClass}">${(
    (obs_high / n) *
    1e6
  ).toFixed(2)}</span></div>
                    </div>
                    <div class="cp-box">
                        <div class="cp-header">預期組內性能 (Within)</div>
                        <div class="cp-row"><span class="${labelClass}">PPM < LSL</span><span class="${valClass}">${ppm_w_low.toFixed(
    2
  )}</span></div>
                        <div class="cp-row"><span class="${labelClass}">PPM > USL</span><span class="${valClass}">${ppm_w_high.toFixed(
    2
  )}</span></div>
                    </div>
                    <div class="cp-box">
                        <div class="cp-header">預期整體性能 (Overall)</div>
                        <div class="cp-row"><span class="${labelClass}">PPM < LSL</span><span class="${valClass}">${ppm_o_low.toFixed(
    2
  )}</span></div>
                        <div class="cp-row"><span class="${labelClass}">PPM > USL</span><span class="${valClass}">${ppm_o_high.toFixed(
    2
  )}</span></div>
                    </div>
                </div>
                <div style="text-align:center; margin-top:10px;" data-html2canvas-ignore="true">
                     <button class="s" onclick="downloadReport(this, '${titleName}_Capability')">下載圖表</button>
                </div>
            `;
  container.appendChild(wrapper);

  const ctx = wrapper.querySelector("canvas").getContext("2d");
  const minVal = Math.min(...allDataFlat, hasLSL ? LSL : Infinity);
  const maxVal = Math.max(...allDataFlat, hasUSL ? USL : -Infinity);
  const range = maxVal - minVal;
  const safeRange = range === 0 ? 1 : range;

  let plotMin, plotMax, binWidth, binCount;
  if (step && step > 0) {
    binWidth = step;
    plotMin = Math.floor((minVal - safeRange * 0.1) / binWidth) * binWidth;
    plotMax = Math.ceil((maxVal + safeRange * 0.1) / binWidth) * binWidth;
  } else {
    binWidth = calculateBinWidth(allDataFlat);
    if (binWidth > safeRange / 5) binWidth = safeRange / 10;
    if (binWidth < safeRange / 100) binWidth = safeRange / 50;
    plotMin = Math.floor((minVal - safeRange * 0.15) / binWidth) * binWidth;
    plotMax = Math.ceil((maxVal + safeRange * 0.15) / binWidth) * binWidth;
  }
  binCount = Math.round((plotMax - plotMin) / binWidth);
  if (binCount > 200) binCount = 200;

  let histogramData = new Array(binCount).fill(0);
  let labels = [];
  for (let i = 0; i < binCount; i++) {
    let binStart = plotMin + i * binWidth;
    let binEnd = binStart + binWidth;
    labels.push(((binStart + binEnd) / 2).toFixed(2));
    allDataFlat.forEach((val) => {
      if (val >= binStart && val < binEnd) {
        histogramData[i]++;
      }
    });
  }

  const scaleFactor = allDataFlat.length * binWidth;
  let lineDataWithin = labels.map(
    (l) => normalPDF(parseFloat(l), mean, stdWithin) * scaleFactor
  );
  let lineDataOverall = labels.map(
    (l) => normalPDF(parseFloat(l), mean, stdOverall) * scaleFactor
  );

  capChartInstances.push(
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "line",
            label: "組內 (Within)",
            data: lineDataWithin,
            borderColor: "#c0392b",
            borderWidth: lineWidth,
            pointRadius: 0,
            tension: 0.4,
            order: 1,
          },
          {
            type: "line",
            label: "整體 (Overall)",
            data: lineDataOverall,
            borderColor: "#2c3e50",
            borderWidth: lineWidth,
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0.4,
            order: 2,
          },
          {
            type: "bar",
            label: "數據 (Data)",
            data: histogramData,
            backgroundColor: "#bdc3c7",
            borderColor: "#7f8c8d",
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            order: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: { display: true, ticks: { maxTicksLimit: 12 } },
          y: { display: false, beginAtZero: true },
        },
      },
      plugins: [
        {
          id: "specLines",
          afterDraw: (chart) => {
            const {
              ctx,
              scales: { x, y },
            } = chart;
            const firstLabelVal = parseFloat(labels[0]);
            const lastLabelVal = parseFloat(labels[labels.length - 1]);
            const totalRange = lastLabelVal - firstLabelVal;
            function getXPos(val) {
              const ratio = (val - firstLabelVal) / totalRange;
              return x.left + ratio * x.width;
            }
            ctx.save();
            ctx.lineWidth = lineWidth;
            const textFont = `${Math.max(12, fontBaseSize * 0.8)}px "Calibri"`;
            const labelY = y.top + 45;
            if (hasLSL) {
              const xPos = getXPos(LSL);
              if (xPos >= x.left && xPos <= x.right) {
                ctx.strokeStyle = config.specColor;
                ctx.setLineDash(config.specStyle === "dashed" ? [10, 5] : []);
                ctx.beginPath();
                ctx.moveTo(xPos, y.top);
                ctx.lineTo(xPos, y.bottom);
                ctx.stroke();
                ctx.fillStyle = config.specColor;
                ctx.font = `bold ${textFont}`;
                ctx.textAlign = "right";
                ctx.fillText(`LSL`, xPos - 5, labelY);
                ctx.font = `normal ${textFont}`;
                ctx.fillText(`${LSL}`, xPos - 5, labelY + 30);
              }
            }
            ctx.setLineDash([]);
            if (hasUSL) {
              const xPos = getXPos(USL);
              if (xPos >= x.left && xPos <= x.right) {
                ctx.strokeStyle = config.specColor;
                ctx.setLineDash(config.specStyle === "dashed" ? [10, 5] : []);
                ctx.beginPath();
                ctx.moveTo(xPos, y.top);
                ctx.lineTo(xPos, y.bottom);
                ctx.stroke();
                ctx.fillStyle = config.specColor;
                ctx.font = `bold ${textFont}`;
                ctx.textAlign = "left";
                ctx.fillText(`USL`, xPos + 5, labelY);
                ctx.font = `normal ${textFont}`;
                ctx.fillText(`${USL}`, xPos + 5, labelY + 30);
              }
            }
            if (hasTarget) {
              const xPos = getXPos(Target);
              if (xPos >= x.left && xPos <= x.right) {
                ctx.strokeStyle = "#27ae60";
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(xPos, y.top);
                ctx.lineTo(xPos, y.bottom);
                ctx.stroke();
                ctx.fillStyle = "#27ae60";
                ctx.font = `bold ${textFont}`;
                ctx.textAlign = "right";
                ctx.fillText(`T`, xPos - 5, labelY);
              }
            }
            ctx.restore();
          },
        },
      ],
    })
  );
}

function deleteOutlierPoint(groupIndexOrName, value) {
  let colIndex = -1;
  if (typeof groupIndexOrName === "string") {
    colIndex = columnsData.findIndex((c) => c.name === groupIndexOrName);
  } else {
  }

  if (colIndex > -1 && columnsData[colIndex]) {
    const arr = columnsData[colIndex].values;
    let idxToRemove = -1;
    let minDiff = 0.000001;

    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== null && Math.abs(arr[i] - value) < minDiff) {
        idxToRemove = i;
        break;
      }
    }

    if (idxToRemove > -1) {
      columnsData[colIndex].values.splice(idxToRemove, 1);
      renderTable();
      go();
    }
  }
}

/**
 * 增強版的盒鬚圖下載功能 (包含 HTML 標題與圖例)
 */
function downloadBoxChartWithHeader(btn, filename) {
  // 找到最接近的容器，它包含了標題、圖例與圖表本身
  const container = btn.closest(".chart-container");

  // 在截圖前暫時隱藏下載按鈕，避免按鈕也被拍進去
  const downloadBtn = container.querySelector("button.s");
  if (downloadBtn) downloadBtn.style.visibility = "hidden";

  html2canvas(container, {
    scale: 2, // 提升 2 倍解析度，確保列印或縮放時清晰
    backgroundColor: "#F7F7F7", // 強制設定背景色，防止透明背景導致黑邊
    useCORS: true, // 允許跨網域資源
    logging: false,
    onclone: (clonedDoc) => {
      // 在克隆的 DOM 中確保文字樣式正確
      const clonedContainer = clonedDoc.querySelector(".chart-container");
      clonedContainer.style.padding = "20px"; // 增加一點內邊距讓畫面更美觀
    },
  })
    .then((canvas) => {
      // 還原按鈕顯示
      if (downloadBtn) downloadBtn.style.visibility = "visible";

      // 執行下載
      const link = document.createElement("a");
      const timestamp = getTimestamp(); // 引用 fileHandler.js 中的函數
      link.download = `${filename}_${timestamp}.png`;
      link.href = canvas.toDataURL("image/png", 1.0); // 1.0 代表最高品質
      link.click();
    })
    .catch((err) => {
      console.error("圖片導出失敗:", err);
      alert("圖片導出失敗，請檢查瀏覽器控制台。");
      if (downloadBtn) downloadBtn.style.visibility = "visible";
    });
}

function downloadReport(btn, filename) {
  html2canvas(btn.closest(".cp-report-wrapper"), {
    scale: 2,
    backgroundColor: "#f4f4f4",
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = filename + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

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

/**
 * 繪製交互作用圖 (Interaction Plot)
 * 修正：標題置中、標題與圖例同高、字體與粗體完全控制
 */
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
/**
 * 還原版：恢復 28px 大字體、卡片樣式、ANOVA 完整數據表與分析結論
 */
function renderStatisticalReport(analysis) {
  const resultDiv = document.getElementById("statisticsResult");
  if (!analysis || !resultDiv) return;

  const groupNames = Object.keys(analysis.names || {}); // 取得組別名稱
  const finalP = analysis.p;
  const pValStr = finalP < 0.0001 ? "< 0.0001" : finalP.toFixed(5);
  const isSignificant = finalP < 0.05;
  const useBold = document.getElementById("useBoldFont")?.checked;
  const b = (t) => (useBold ? `<b>${t}</b>` : t);

  // 輔助格式化函式
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) =>
    p < 0.05
      ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著差異</span>`
      : `<span style="color:#2ecc71;">無顯著差異</span>`;

  // 1. 建立專業卡片容器 (28px 字體)
  let html = `
    <div style="margin: 40px auto; max-width: 95%; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #e0e0e0; font-family: 'Calibri', 'Microsoft JhengHei', sans-serif; text-align:left; font-size: 28px;">
        
        <div style="display: flex; align-items: center; border-bottom: 4px solid #1f4e78; padding-bottom: 15px; margin-bottom: 20px;">
            <span style="font-size: 32px; margin-right: 12px;">📊</span>
            <h2 style="margin:0; color: #1f4e78; font-size: 32px;">
                統計分析報告 <span style="font-size: 24px; font-weight: normal; color: #555;">(Statistical Analysis Report)</span>
            </h2>
        </div>
        <p style="margin-bottom: 20px;">${b("檢定方法：")} ${
    analysis.displayMethod
  } ${analysis.isWelch ? "(Welch)" : ""}</p>
  `;

  // 2. 生成數據表格
  switch (analysis.type) {
    case "ANOVA":
      const resA = analysis.data;
      html += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 24px;">
            <thead>
                <tr style="background: #f8f9fa; border-top: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">變異來源</th>
                    <th style="padding: 12px; text-align: center;">SS</th>
                    <th style="padding: 12px; text-align: center;">df</th>
                    <th style="padding: 12px; text-align: center;">MS</th>
                    <th style="padding: 12px; text-align: center;">F</th>
                    <th style="padding: 12px; text-align: center;">P-value</th>
                    <th style="padding: 12px; text-align: center;">判定</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">組間 (Between)</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.ssb
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${
                      resA.df1
                    }</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.ssb / resA.df1
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.F
                    )}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${pValStr}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${getFlag(finalP)}</td>
                </tr>
                <tr style="background: #fafafa;">
                    <td style="padding: 12px;">組內 (Within)</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.ssw
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${resA.df2.toFixed(
                      1
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.ssw / resA.df2
                    )}</td>
                    <td colspan="3" style="padding: 12px; text-align: center; color: #7f8c8d;">誤差項</td>
                </tr>
            </tbody>
        </table>`;
      break;

    case "PAIRED_T":
    case "INDEPENDENT_T":
    case "ONE_SAMPLE_T":
      const tRes = analysis.data;
      html += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 24px;">
            <thead>
                <tr style="background: #f8f9fa; border-top: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">比較項</th>
                    <th style="padding: 12px; text-align: center;">T 統計量</th>
                    <th style="padding: 12px; text-align: center;">df</th>
                    <th style="padding: 12px; text-align: center;">P-Value</th>
                    <th style="padding: 12px; text-align: center;">判定</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${
                      analysis.names ? analysis.names.join(" vs ") : "樣本數據"
                    }</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      tRes.t
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${tRes.df.toFixed(
                      2
                    )}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${pValStr}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${getFlag(finalP)}</td>
                </tr>
            </tbody>
        </table>`;
      break;
  }

  // 3. 分析結論區
  html += `
        <div style="background: #f1f6f9; border-left: 6px solid #2980b9; padding: 20px; border-radius: 0 4px 4px 0; margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #1f4e78; font-size: 30px; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📝</span> 分析結論：
            </h3>
            <p style="margin: 0; font-size: 24px; line-height: 1.6; color: #333;">
                檢定 P-Value 為 <b style="font-size: 30px;">${pValStr}</b>。在 α=0.05 顯著水準下，
                ${
                  isSignificant
                    ? `<span style="color:#c0392b; font-weight:bold;">拒絕虛無假設</span>。結果顯示不同組別之間存在顯著差異，建議檢查製程。`
                    : `<span style="color:#2ecc71; font-weight:bold;">無法拒絕虛無假設</span>。目前數據不足以證明組別之間存在顯著差異。`
                }
            </p>
        </div>
    </div>`;

  // 4. 事後檢定表格 (若有)
  if (analysis.postHoc && analysis.postHoc.length > 0) {
    html += `
      <div style="margin: 20px auto; max-width: 95%; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #e0e0e0; font-family: 'Microsoft JhengHei'; font-size: 28px;">
        <h3 style="color: #1f4e78; border-bottom: 3px solid #2980b9; padding-bottom: 10px; font-size: 30px;">${analysis.postHocTitle}</h3>
        <table style="width:100%; border-collapse: collapse; margin-top:15px; font-size:24px;">
            <thead><tr style="background:#f8f9fa; border-bottom:2px solid #dee2e6;"><td>比較對象</td><td style="text-align:center;">差異值</td><td style="text-align:center;">Q 統計量</td><td style="text-align:center;">判定</td></tr></thead>
            <tbody>`;
    analysis.postHoc.forEach((ph) => {
      html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding:10px;">${
        ph.pair
      }</td><td style="text-align:center;">${
        ph.diff
      }</td><td style="text-align:center;">${
        ph.qValue
      }</td><td style="text-align:center;">${
        ph.isSignificant ? '<b style="color:#c0392b;">🚩 顯著</b>' : "不顯著"
      }</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  resultDiv.style.display = "block";
  resultDiv.innerHTML = html;
}
