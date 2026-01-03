/**
 * boxRenderer.js - 盒鬚圖專用
 */
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

  // --- 1. 使用外部傳入的 analysisResult 生成摘要框 ---
  let statsHeaderBoxHtml = "";

  if (showPValueCheckbox && analysisResult && analysisResult.data) {
    const d = analysisResult.data;
    const isSig = (analysisResult.p || 0) < 0.05;
    const pValStr =
      analysisResult.p < 0.0001
        ? "0.00000"
        : analysisResult.p
        ? analysisResult.p.toFixed(5)
        : "---";

    let methodDisplay = analysisResult.type || "Test";
    let statVal = "---";
    let dfDisplay = "---";

    if (methodDisplay === "ANOVA") {
      methodDisplay = analysisResult.isWelch
        ? "Welch's ANOVA"
        : "One-way ANOVA";
      statVal = d.F ? d.F.toFixed(3) : "---";
      dfDisplay = `${d.df1?.toFixed(0)}, ${d.df2?.toFixed(1)}`;
    } else if (methodDisplay === "TWO_WAY") {
      methodDisplay = "Two-way ANOVA";
      statVal = "See Table"; // 雙因子有多個 F 值，此處簡化
      dfDisplay = `Multiple`;
    } else if (methodDisplay.includes("T")) {
      methodDisplay = methodDisplay.replace("_", " ");
      statVal = d.t ? d.t.toFixed(3) : "---";
      dfDisplay = d.df ? d.df.toFixed(1) : "---";
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
                <td style="text-align:right;">${statVal}</td></tr>
            <tr><td style="color:#666;">df</td>
                <td style="text-align:right;">${dfDisplay}</td></tr>
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
