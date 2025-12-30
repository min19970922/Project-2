function go() {
  // --- 1. 初始化與清空舊圖表 ---
  plotlyCharts.forEach((id) => {
    try {
      Plotly.purge(id);
    } catch (e) { }
  });
  plotlyCharts = [];
  capChartInstances.forEach((c) => c.destroy());
  capChartInstances = [];

  const container = document.getElementById("charts");
  container.innerHTML = "";

  let resultDiv = document.getElementById("statisticsResult");
  if (!resultDiv) {
    resultDiv = document.createElement("div");
    resultDiv.id = "statisticsResult";
    container.parentNode.insertBefore(resultDiv, container.nextSibling);
  }
  resultDiv.innerHTML = "";

  // --- 2. 數據整理與量體檢查 ---
  const rawActiveGroups = columnsData.filter(
    (c) => !c.isSequence && c.values.some((v) => v !== null && !isNaN(v))
  );

  if (rawActiveGroups.length === 0) return;

  const POINT_LIMIT = 1000;
  let totalCount = 0;
  rawActiveGroups.forEach((g) => {
    totalCount += g.values.filter((v) => v !== null && !isNaN(v)).length;
  });

  let activeGroupsForPlot = rawActiveGroups;
  if (totalCount > POINT_LIMIT) {
    const proceed = confirm(
      `數據量較大 (共 ${totalCount} 點)。\n圖表將進行等距抽樣 (每組最多顯示 40 點)。\n統計分析仍會使用全量數據。是否繼續？`
    );
    if (!proceed) return;

    activeGroupsForPlot = rawActiveGroups.map((group) => {
      const validVals = group.values.filter((v) => v !== null && !isNaN(v));
      if (validVals.length > 40) {
        const step = Math.ceil(validVals.length / 40);
        return {
          ...group,
          values: validVals.filter((_, idx) => idx % step === 0),
        };
      }
      return group;
    });
  }

  // --- 3. 讀取 UI 設定 ---
  const mainTitle = document.getElementById("mainTitle").value || "圖表";
  const titleFontSize =
    parseInt(document.getElementById("titleFontSize").value) || 48;
  const yUnit = document.getElementById("yUnitLeft").value;
  const fontSize = parseInt(document.getElementById("fontSize").value) || 16;
  const statFontSize =
    parseInt(document.getElementById("statFontSize").value) || fontSize;
  const lineWidth = parseInt(document.getElementById("lineWidth").value) || 3;
  const pointSize = parseInt(document.getElementById("pointSize").value) || 5;
  const specLSL = parseFloat(document.getElementById("specLSL").value);
  const specUSL = parseFloat(document.getElementById("specUSL").value);
  const specTarget = parseFloat(document.getElementById("specTarget").value);
  const specLineStyle = document.getElementById("specLineStyle").value;
  const specLineColor = document.getElementById("specLineColor").value;
  const showBox = document.getElementById("showBox").checked;
  const showDot = document.getElementById("showDot").checked;
  const showCapability = document.getElementById("showCapability").checked;
  const combineGroups = document.getElementById("combineGroups").checked;
  const useBold = document.getElementById("useBoldFont").checked;
  const yMinInput = document.getElementById("yMinLeft").value;
  const yMin = yMinInput === "" ? null : parseFloat(yMinInput);
  const yMaxInput = document.getElementById("yMaxLeft").value;
  const yMax = yMaxInput === "" ? null : parseFloat(yMaxInput);
  const yStep = parseFloat(document.getElementById("yStepLeft").value) || null;
  const chartHeight =
    parseInt(document.getElementById("chartHeight").value) || 600;
  const boxGap = parseFloat(document.getElementById("boxGap").value) || 0.3;
  const exX =
    parseInt(document.getElementById("extremeXOffsetInput").value) || 32;
  const mmX =
    parseInt(document.getElementById("meanMedianXOffsetInput").value) || 25;

  // --- 4. 執行圖表繪製 (使用抽樣數據 activeGroupsForPlot) ---
  const groupNames = activeGroupsForPlot.map((c) => c.name);
  const colors = activeGroupsForPlot.map((c) => c.color);
  const boxDataArray = activeGroupsForPlot.map((c) =>
    c.values.filter((v) => v !== null && !isNaN(v))
  );

  if (showBox) {
    createPlotlyBoxChart(
      boxDataArray,
      groupNames,
      colors,
      mainTitle,
      yUnit,
      "charts",
      fontSize,
      lineWidth,
      pointSize,
      yMin,
      yMax,
      yStep,
      exX,
      mmX,
      document.getElementById("showOutliers").checked,
      document.getElementById("showAllPoints").checked,
      statFontSize,
      chartHeight,
      boxGap,
      titleFontSize
    );
  }

  const showLine = document.getElementById("modeLine").checked;
  const showBar = document.getElementById("modeBar").checked;
  const showMixed = document.getElementById("modeMixed").checked;
  const yUnitRight = document.getElementById("yUnitRight").value || "";
  const trendConfig = {
    fontSize,
    lineWidth,
    pointSize,
    chartHeight,
    useBold,
    titleFontSize,
    colors,
    boxGap,
  };

  if (showLine)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      yUnitRight,
      "charts",
      "line",
      trendConfig
    );
  if (showBar)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      yUnitRight,
      "charts",
      "bar",
      trendConfig
    );
  if (showMixed)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      yUnitRight,
      "charts",
      "mixed",
      trendConfig
    );

  if (showDot) {
    const dotData = activeGroupsForPlot.map((g) => ({
      label: g.name,
      values: g.values.filter((v) => v !== null && !isNaN(v)),
    }));
    createClassicDotPlot(
      dotData,
      colors,
      mainTitle,
      yUnit,
      container,
      fontSize,
      yStep,
      document.getElementById("showGrid").checked,
      lineWidth,
      useBold,
      chartHeight,
      titleFontSize
    );
  }

  // --- 5. 執行進階統計檢定 (使用全量數據 rawActiveGroups) ---
  if (
    document.getElementById("showPValue")?.checked ||
    document.getElementById("showPairedP")?.checked
  ) {
    const isTwoWay = rawActiveGroups.every((g) => g.name.includes("_"));
    if (isTwoWay && !document.getElementById("showPairedP")?.checked) {
      const allNames = rawActiveGroups.map(g => g.name.split("_"));

      // 輔助函式：提取一組水平名稱中的共同字首（因子）與剩餘字尾（水平）
      const extractFactorAndLevels = (nameParts, index) => {
        const levels = nameParts.map(p => p[index] || "");
        if (levels.length === 0) return { factor: `因子 ${index + 1}`, cleanLevels: [] };

        // 找出所有名稱的最長共同字首
        let firstStr = levels[0];
        let commonPrefix = "";
        for (let i = 0; i < firstStr.length; i++) {
          let char = firstStr[i];
          if (levels.every(s => s[i] === char)) {
            commonPrefix += char;
          } else {
            break;
          }
        }

        // 如果沒有共同字首，就用預設名稱
        const factorName = commonPrefix.trim() || `因子 ${index + 1}`;
        // 去除共同字首後的剩餘部分作為「水平」
        const cleanLevels = levels.map(s => s.replace(commonPrefix, "").trim() || s);

        return { factor: factorName, cleanLevels: cleanLevels };
      };

      const resA = extractFactorAndLevels(allNames, 0);
      const resB = extractFactorAndLevels(allNames, 1);

      const nameA = resA.factor;
      const nameB = resB.factor;

      // 整理數據給 ANOVA 運算與交互作用圖
      const twoWayInput = rawActiveGroups.map((g, idx) => {
        return {
          f1: resA.cleanLevels[idx],
          f2: resB.cleanLevels[idx],
          values: g.values.filter((v) => v !== null && !isNaN(v)),
        };
      });

      const res = twoWayAnova(twoWayInput);
      renderTwoWayTable(res, nameA, nameB);

      // 繪製交互作用圖
      createInteractionPlot(twoWayInput, nameA, nameB, mainTitle, yUnit, "charts", {
        fontSize, lineWidth, pointSize, chartHeight, useBold, titleFontSize
      });
    } else {
      performAdvancedStats(rawActiveGroups, specTarget);
    }
  } else {
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";
  }

  // --- 6. 執行製程能力分析 (使用全量數據 rawActiveGroups) ---
  if (showCapability) {
    const mode = document.getElementById("subgroupMode").value;
    const sizeVal = document.getElementById("subgroupSizeInput").value;
    const size = sizeVal ? parseInt(sizeVal) : null;
    const capConfig = {
      LSL: specLSL,
      USL: specUSL,
      Target: specTarget,
      specColor: specLineColor,
      specStyle: specLineStyle,
      fontBaseSize: fontSize,
      lineWidth: lineWidth,
      step: yStep,
    };

    if (combineGroups) {
      const allData = rawActiveGroups.flatMap((g) =>
        g.values.filter((v) => v !== null && !isNaN(v))
      );
      let subgroups = [];
      if (mode === "column") {
        subgroups = rawActiveGroups.map((g) =>
          g.values.filter((v) => v !== null && !isNaN(v))
        );
      } else if (mode === "row") {
        let maxLen = Math.max(...rawActiveGroups.map((g) => g.values.length));
        for (let i = 0; i < maxLen; i++) {
          let row = [];
          rawActiveGroups.forEach((g) => {
            if (g.values[i] != null && !isNaN(g.values[i]))
              row.push(g.values[i]);
          });
          if (row.length > 0) subgroups.push(row);
        }
      } else {
        let s = size && size > 0 ? size : 1;
        for (let i = 0; i < allData.length; i += s)
          subgroups.push(allData.slice(i, i + s));
      }
      renderCapabilityReport(
        container,
        allData,
        subgroups,
        mainTitle + " (Global)",
        capConfig
      );
    } else {
      rawActiveGroups.forEach((g) => {
        const d = g.values.filter((v) => v !== null && !isNaN(v));
        if (d.length < 2) return;
        let localConfig = { ...capConfig };
        const specMatch = g.name.match(/[\{\｛](.+?)[\}\｝]/);
        let displayName = g.name;
        if (specMatch) {
          displayName = g.name.replace(/[\{\｛].+?[\}\｝]/, "").trim();
          const parts = specMatch[1].split(/[,，]/).map((s) => s.trim());
          if (parts.length >= 2) {
            if (parts[0]) localConfig.LSL = parseFloat(parts[0]);
            if (parts.length === 3) {
              if (parts[1]) localConfig.Target = parseFloat(parts[1]);
              if (parts[2]) localConfig.USL = parseFloat(parts[2]);
            } else if (parts.length === 2) {
              if (parts[1]) localConfig.USL = parseFloat(parts[1]);
              localConfig.Target = NaN;
            }
          }
        }
        let subgroups = mode === "column" ? [d] : [];
        if (mode !== "column") {
          let s = size && size > 0 ? size : 1;
          for (let i = 0; i < d.length; i += s)
            subgroups.push(d.slice(i, i + s));
        }
        renderCapabilityReport(
          container,
          d,
          subgroups,
          displayName,
          localConfig
        );
      });
    }
  }
}

function performAdvancedStats(activeGroups, targetValue) {
  const resultDiv = document.getElementById("statisticsResult");
  const isPairedMode = document.getElementById("showPairedP")?.checked;
  if (!resultDiv) return;

  const logicalGroups = activeGroups.reduce((acc, col) => {
    const prefix = col.name.split("/")[0].trim();
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(...col.values.filter((v) => v !== null && !isNaN(v)));
    return acc;
  }, {});

  const groupNames = Object.keys(logicalGroups);
  const analysis = calculateAdvancedStats(logicalGroups, targetValue, isPairedMode);

  if (!analysis.type || groupNames.length === 0) {
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";
    return;
  }

  // --- FIX: Define finalP based on test type ---
  let finalP = 0;
  if (analysis.type === "ANOVA") {
    const groupsArray = groupNames.map(n => logicalGroups[n]);
    const lev = leveneTest(groupsArray);
    // If variance is not homogeneous, use Welch ANOVA p-value
    const finalData = !lev.isHomogeneous ? welchAnova(groupsArray) : analysis.data;
    finalP = finalData.p;
  } else {
    // For T-Tests
    finalP = analysis.data.p;
  }

  resultDiv.style.display = "block";
  resultDiv.style.background = "#ffffff";
  resultDiv.style.padding = "40px";
  resultDiv.style.border = "1px solid #d1d3d1";
  resultDiv.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";

  const formatP = (p) => {
    const isSig = p < 0.05;
    let pStr;
    if (p < 0.0001) {
      pStr = "&lt; 0.0001"; // 極小值統一顯示為小於 0.0001
    } else if (p < 0.001) {
      pStr = p.toExponential(4); // 0.0001 ~ 0.001 之間使用科學記號
    } else {
      pStr = p.toFixed(5); // 其餘顯示五位小數
    }
    return isSig ? `<b style="color:#c0392b;">${pStr}</b>` : pStr;
  };
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) => (p < 0.05 ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著差異</span>` : `<span style="color:#7f8c8d;">不顯著</span>`);

  const getFCritHelper = (df1, df2, alpha = 0.05) => {
    if (typeof fCDF !== 'function') return "---";
    let low = 0, high = 1000;
    for (let i = 0; i < 20; i++) {
      let mid = (low + high) / 2;
      if (1 - fCDF(mid, df1, df2) > alpha) low = mid;
      else high = mid;
    }
    return high.toFixed(4);
  };

  const tableHeaderStyle = "background:#f2f2f2; border:1px solid #d1d3d1; padding:15px; text-align:left; font-weight:bold; font-size:20px;";
  const tableCellStyle = "border:1px solid #d1d3d1; padding:15px; font-size:20px;";

  let html = `<div style='font-family: "Calibri", "Microsoft JhengHei", sans-serif; color: #333;'>`;
  html += `<h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; padding-bottom: 12px; font-size: 28px; margin-bottom: 20px;">📊 統計分析報告 (Statistical Analysis Report)</h2>`;

  switch (analysis.type) {
    case "ONE_SAMPLE_T":
      html += `<p style="font-size: 20px; margin-bottom: 15px;">檢定類型：<b>單一樣本 T 檢定 (One-sample T-test)</b></p>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr style="${tableHeaderStyle}"><td>檢定項</td><td>N</td><td>平均值</td><td>目標值</td><td>T 統計量</td><td>df</td><td>P-Value</td><td>判定</td></tr></thead>
          <tbody>
            <tr>
              <td style="${tableCellStyle}">${groupNames[0]}</td>
              <td style="${tableCellStyle}">${analysis.data.n}</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.mean)}</td>
              <td style="${tableCellStyle}">${targetValue}</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.t)}</td>
              <td style="${tableCellStyle}">${analysis.data.df}</td>
              <td style="${tableCellStyle}">${formatP(analysis.data.p)}</td>
              <td style="${tableCellStyle}">${getFlag(analysis.data.p)}</td>
            </tr>
          </tbody>
        </table>`;
      break;

    case "PAIRED_T":
    case "INDEPENDENT_T":
      const d1 = logicalGroups[groupNames[0]];
      const d2 = logicalGroups[groupNames[1]];
      const levT = leveneTest([d1, d2]);
      const tRes = independentTTest(d1, d2, levT.isHomogeneous);
      const tTitle = levT.isHomogeneous ? "獨立樣本 T 檢定 (等變異)" : "Welch's T 檢定 (不等變異)";

      html += `
        <p style="font-size: 20px; margin-bottom: 5px;">檢定類型：<b>${tTitle}</b></p>
        <p style="font-size: 16px; color: #666; margin-bottom: 15px;">
            (變異數齊一性檢定 P-value: ${levT.p.toFixed(4)}，判定為${levT.isHomogeneous ? '齊一' : '不齊一'})
        </p>
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="${tableHeaderStyle}">
                <td>比較組別</td><td>T 統計量</td><td>自由度 (df)</td><td>P-Value</td><td>判定</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="${tableCellStyle}">${groupNames[0]} vs ${groupNames[1]}</td>
              <td style="${tableCellStyle}">${formatVal(tRes.t)}</td>
              <td style="${tableCellStyle}">${tRes.df.toFixed(2)}</td>
              <td style="${tableCellStyle}">${formatP(tRes.p)}</td>
              <td style="${tableCellStyle}">${getFlag(tRes.p)}</td>
            </tr>
          </tbody>
        </table>`;
      finalP = tRes.p;
      break;

    case "ANOVA":
      const groupsArrayAnova = groupNames.map(n => logicalGroups[n]);
      const levAnova = leveneTest(groupsArrayAnova);
      const useWelch = !levAnova.isHomogeneous;
      const finalDataAnova = useWelch ? welchAnova(groupsArrayAnova) : analysis.data;
      const msB = analysis.data.ssb / analysis.data.df1;
      const msW = analysis.data.ssw / analysis.data.df2;

      html += `<p style="font-size: 20px; margin-bottom: 15px;">檢定類型：<b>${useWelch ? "Welch's ANOVA" : "One-way ANOVA"}</b></p>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr style="${tableHeaderStyle}"><td>變異來源</td><td>SS</td><td>df</td><td>MS</td><td>F</td><td>P-value</td><td>F crit</td><td>判定</td></tr></thead>
          <tbody>
            <tr>
              <td style="${tableCellStyle}">組間</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssb)}</td>
              <td style="${tableCellStyle}">${analysis.data.df1}</td>
              <td style="${tableCellStyle}">${formatVal(msB)}</td>
              <td style="${tableCellStyle}">${formatVal(finalDataAnova.F)}</td>
              <td style="${tableCellStyle}">${formatP(finalDataAnova.p)}</td>
              <td style="${tableCellStyle}">${getFCritHelper(finalDataAnova.df1, finalDataAnova.df2)}</td>
              <td style="${tableCellStyle}">${getFlag(finalDataAnova.p)}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="${tableCellStyle}">組內</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssw)}</td>
              <td style="${tableCellStyle}">${analysis.data.df2}</td>
              <td style="${tableCellStyle}">${formatVal(msW)}</td>
              <td style="${tableCellStyle}">---</td><td>---</td><td>---</td><td>誤差項</td>
            </tr>
          </tbody>
        </table>`;
      break;
  }
  if (analysis.postHoc && analysis.postHoc.length > 0) {
    html += `<h3 style="color: #1f4e78; margin-top:20px;">🔍 事後檢定 (Tukey HSD)</h3>
           <table style="width:100%; border-collapse: collapse;">
             <thead><tr style="${tableHeaderStyle}"><td>比較對象</td><td>差異值</td><td>Q 統計量</td><td>顯著性</td></tr></thead>
             <tbody>`;
    analysis.postHoc.forEach(ph => {
      html += `<tr>
      <td style="${tableCellStyle}">${ph.pair}</td>
      <td style="${tableCellStyle}">${ph.diff}</td>
      <td style="${tableCellStyle}">${ph.qValue} (臨界值:${ph.qCrit})</td>
      <td style="${tableCellStyle}">${ph.isSignificant ? '🚩 顯著' : '不顯著'}</td>
    </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Final summary using the now-defined finalP
  const finalPStr = finalP < 0.0001 ? "< 0.0001" : finalP.toFixed(5);
  html += `<div style="margin-top:30px; padding:25px; background:#f4f7f9; border-left:10px solid #2980b9;">
            <b style="font-size:26px; color:#1f4e78;">📝 分析結論：</b><br>
            <p style="margin-top:15px; line-height:1.8; font-size:22px;">
              檢定 P-Value 為 <b>${finalP.toFixed(5)}</b>。在 α=0.05 顯著水準下，
              ${finalP < 0.05 ?
      `<span style="color:#c0392b;"><b>拒絕虛無假設</b>。結果顯示不同組別之間存在顯著差異。</span>` :
      `<span><b>無法拒絕虛無假設</b>。目前數據不足以證明組別之間存在顯著差異。</span>`}
            </p>
          </div></div>`;
  resultDiv.innerHTML = html;
}

function autoGroupColoring() {
  const groupMap = {};
  // 30 組專業高辨識度配色 (兼顧冷暖色調與視覺層次)
  let baseColors = [
    // --- 第一梯次：核心高對比色 (最先使用的 10 色) ---
    "#1F77B4", // 科技藍
    "#FF7F0E", // 亮橘
    "#2CA02C", // 鮮草綠
    "#D62728", // 強烈紅
    "#9467BD", // 皇家紫
    "#8C564B", // 巧克力褐
    "#E377C2", // 莓果粉
    "#7F7F7F", // 中性灰
    "#BCBD22", // 橄欖金
    "#17BECF", // 青天藍

    // --- 第二梯次：深色系強對比 (強化區分度) ---
    "#003F5C", // 深海藍
    "#DE425B", // 玫紅
    "#488F31", // 深綠
    "#6050DC", // 靛藍
    "#B33016", // 磚紅
    "#00A3AD", // 藍綠
    "#8A2BE2", // 紫羅蘭
    "#FFA600", // 亮金
    "#58508D", // 暮紫
    "#BC5090", // 桃紅

    // --- 第三梯次：高彩度辨識 (適合多組別) ---
    "#00D2D3", // 翡翠
    "#54A0FF", // 亮天藍
    "#5F27CD", // 深藍紫
    "#EE5253", // 珊瑚紅
    "#01A3A4", // 墨綠藍
    "#FF9F43", // 暖橘
    "#10AC84", // 碧綠
    "#222F3E", // 碳黑
    "#F368E0", // 鮮亮粉
    "#FF6B6B", // 鮭魚紅
  ];

  // 隨機打亂顏色順序
  for (let i = baseColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baseColors[i], baseColors[j]] = [baseColors[j], baseColors[i]];
  }

  let colorIdx = 0;

  columnsData.forEach((col) => {
    if (col.isSequence) return;
    // 依據斜槓前置分組名稱分配顏色
    const prefix = col.name.split("/")[0].trim();

    if (!groupMap[prefix]) {
      // 依照分組順序取用顏色，若超過 30 組則循環使用
      groupMap[prefix] = baseColors[colorIdx % baseColors.length];
      colorIdx++;
    }

    col.color = groupMap[prefix];
  });

  renderTable();
  go();
}

function renderTwoWayTable(res, nameA, nameB) {
  const resultDiv = document.getElementById("statisticsResult");
  if (!resultDiv) return;

  resultDiv.style.display = "block";
  resultDiv.style.background = "#ffffff";
  resultDiv.style.padding = "45px"; // 增加內距
  resultDiv.style.border = "1px solid #d1d3d1";
  resultDiv.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";

  const formatP = (p) => {
    const isSig = p < 0.05;
    const pStr = p < 0.0001 ? "&lt; 0.0001" : p.toFixed(5);
    return isSig ? `<b style="color:#c0392b;">${pStr}</b>` : pStr;
  };
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) => (p < 0.05 ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著差異</span>` : `<span style="color:#7f8c8d;">不顯著</span>`);

  // 計算 F 臨界值輔助函數
  const getFCritHelper = (df1, df2, alpha = 0.05) => {
    if (typeof fCDF !== 'function') return "---";
    let low = 0, high = 1000;
    for (let i = 0; i < 20; i++) {
      let mid = (low + high) / 2;
      if (1 - fCDF(mid, df1, df2) > alpha) low = mid;
      else high = mid;
    }
    return high.toFixed(4);
  };

  const msA = res.factorA.f * res.error.ms;
  const msB = res.factorB.f * res.error.ms;
  const msAB = res.interaction.f * res.error.ms;
  const ssA = msA * res.factorA.df;
  const ssB = msB * res.factorB.df;
  const ssAB = msAB * res.interaction.df;
  const ssE = res.error.ms * res.error.df;

  // 表格樣式調整 (提升至 20px)
  const tableHeaderStyle = "background:#f2f2f2; border:1px solid #d1d3d1; padding:15px; font-weight:bold; font-size:20px;";
  const tableCellStyle = "border:1px solid #d1d3d1; padding:15px; font-size:20px;";

  let html = `<div style='font-family: "Calibri", "Microsoft JhengHei", sans-serif; color: #333;'>`;
  html += `<h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; padding-bottom: 12px; font-size: 28px; margin-bottom: 20px;">📊 統計分析報告 (Statistical Analysis Report)</h2>`;
  html += `<p style="font-size: 24px; margin-bottom: 20px;">檢定類型：<b>雙因子變異數分析 (Two-way ANOVA)</b></p>`;
  html += `
    <table style="width:100%; border-collapse: collapse; margin-top:5px;">
      <thead>
        <tr style="${tableHeaderStyle}">
          <td>變異來源 (Source)</td><td>SS (平方和)</td><td>df</td><td>MS (均方)</td><td>F (統計量)</td><td>P-value</td><td>F crit</td><td>判定</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tableCellStyle}">因子 A：<b>${nameA}</b></td>
          <td style="${tableCellStyle}">${formatVal(ssA)}</td><td style="${tableCellStyle}">${res.factorA.df}</td><td style="${tableCellStyle}">${formatVal(msA)}</td>
          <td style="${tableCellStyle}">${formatVal(res.factorA.f)}</td><td style="${tableCellStyle}">${formatP(res.factorA.p)}</td>
          <td style="${tableCellStyle}">${getFCritHelper(res.factorA.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.factorA.p)}</td>
        </tr>
        <tr>
          <td style="${tableCellStyle}">因子 B：<b>${nameB}</b></td>
          <td style="${tableCellStyle}">${formatVal(ssB)}</td><td style="${tableCellStyle}">${res.factorB.df}</td><td style="${tableCellStyle}">${formatVal(msB)}</td>
          <td style="${tableCellStyle}">${formatVal(res.factorB.f)}</td><td style="${tableCellStyle}">${formatP(res.factorB.p)}</td>
          <td style="${tableCellStyle}">${getFCritHelper(res.factorB.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.factorB.p)}</td>
        </tr>
        <tr style="background:#fdfefe;">
          <td style="${tableCellStyle}">交互作用 (Interaction)</td>
          <td style="${tableCellStyle}">${formatVal(ssAB)}</td><td style="${tableCellStyle}">${res.interaction.df}</td><td style="${tableCellStyle}">${formatVal(msAB)}</td>
          <td style="${tableCellStyle}">${formatVal(res.interaction.f)}</td><td style="${tableCellStyle}">${formatP(res.interaction.p)}</td>
          <td style="${tableCellStyle}">${getFCritHelper(res.interaction.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.interaction.p)}</td>
        </tr>
        <tr style="background:#fafafa; color:#666;">
          <td style="${tableCellStyle}">誤差 (Error)</td>
          <td style="${tableCellStyle}">${formatVal(ssE)}</td><td style="${tableCellStyle}">${res.error.df}</td><td style="${tableCellStyle}">${formatVal(res.error.ms)}</td>
          <td style="${tableCellStyle}">---</td><td>---</td><td>---</td><td style="${tableCellStyle}">均方誤差</td>
        </tr>
      </tbody>
    </table>`;

  html += `<div style="margin-top:35px; padding:25px; background:#f4f7f9; border-left:10px solid #2980b9;">
            <b style="font-size:26px; color:#1f4e78;">📝 分析結論：</b><br>
            <ul style="margin-top:15px; line-height:1.8; font-size:22px;">
              <li><b>因子 A - 【${nameA}】：</b>${res.factorA.p < 0.05 ? `顯著差異 (P < 0.05)。` : `不顯著差異 (P > 0.05)。`}</li>
              <li><b>因子 B - 【${nameB}】：</b>${res.factorB.p < 0.05 ? `顯著差異 (P < 0.05)。` : `不顯著差異 (P > 0.05)。`}</li>
              <li><b>交互作用 (${nameA} × ${nameB})：</b>${res.interaction.p < 0.05 ? `<span style='color:#c0392b;'><b>顯著！</b> 影響效果隨另一因子改變。</span>` : `不顯著。兩因子相互獨立。`}</li>
            </ul>
          </div>`;

  html += "</div>";
  resultDiv.innerHTML = html;
}
/**
 * 初始化監聽器
 */
document.addEventListener("DOMContentLoaded", () => {
  // 將搬移至「規格與座標」的四個欄位加入監聽
  const realTimeInputs = [
    "fontSize",
    "titleFontSize",
    "lineWidth",
    "pointSize",
    "specLSL",
    "specUSL",
    "specTarget",
    "yMinLeft",
    "yMaxLeft",
    "yStepLeft",
    "subgroupSizeInput",
    "extremeXOffsetInput",
    "meanMedianXOffsetInput",
    "statFontSize",
    "chartHeight",
    "boxGap",
  ];

  realTimeInputs.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      clearTimeout(window.rtTimeout);
      window.rtTimeout = setTimeout(go, 20);
    });
  });

  const changeInputs = [
    "specLineColor",
    "specLineStyle",
    "showBox",
    "modeBox",
    "modeLine",
    "modeBar",
    "modeMixed",
    "showDot",
    "yUnitRight",
    "showOutliers",
    "showAllPoints",
    "showMean",
    "showMedian",
    "showExtremes",
    "showGrid",
    "useBoldFont",
    "showCapability",
    "combineGroups",
    "subgroupMode",
    "stdDevMethod",
    "showPValue",
    "showPairedP",
  ];

  changeInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", go);
      if (el.type !== "checkbox") el.addEventListener("input", go);
    }
  });

  initTable();
  loadSettings();
  if (!localStorage.getItem("chart_34_4_settings")) go();

  // 刪除異常點監聽
  document.addEventListener("keydown", (e) => {
    const isDeleteKey = e.key === "Delete" || e.key === "Backspace";
    const isActiveElementInput = document.activeElement.tagName === "INPUT";
    if (isDeleteKey && lastClickedPoint && !isActiveElementInput) {
      e.preventDefault();
      deleteOutlierPoint(lastClickedPoint.groupName, lastClickedPoint.value);
      lastClickedPoint = null;
    }
  });
});

window.addEventListener("resize", () => {
  plotlyCharts.forEach((id) => {
    try {
      Plotly.Plots.resize(document.getElementById(id));
    } catch (e) { }
  });
});
