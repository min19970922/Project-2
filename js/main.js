/**
 * main.js - 進階統計與趨勢系統核心邏輯 (修復完整版)
 */

function go() {
  const scrollPos = window.scrollY;
  // --- 1. 初始化與清空舊圖表 ---
  plotlyCharts.forEach((id) => {
    try {
      Plotly.purge(id);
    } catch (e) {}
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
  const specLineColor = document.getElementById("specLineColor").value;
  const specLineStyle = document.getElementById("specLineStyle").value;
  const showBox = document.getElementById("showBox").checked;
  const showDot = document.getElementById("showDot").checked;
  const showCapability = document.getElementById("showCapability").checked;
  const combineGroups = document.getElementById("combineGroups").checked;
  const useBold = document.getElementById("useBoldFont").checked;
  const yMin =
    document.getElementById("yMinLeft").value === ""
      ? null
      : parseFloat(document.getElementById("yMinLeft").value);
  const yMax =
    document.getElementById("yMaxLeft").value === ""
      ? null
      : parseFloat(document.getElementById("yMaxLeft").value);
  const yStep = parseFloat(document.getElementById("yStepLeft").value) || null;
  const chartHeight =
    parseInt(document.getElementById("chartHeight").value) || 600;
  const boxGap = parseFloat(document.getElementById("boxGap").value) || 0.3;
  const exX =
    parseInt(document.getElementById("extremeXOffsetInput").value) || 32;
  const mmX =
    parseInt(document.getElementById("meanMedianXOffsetInput").value) || 25;

  const logicalGroups = rawActiveGroups.reduce((acc, col) => {
    const prefix = col.name.split("\\")[0].trim();
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(...col.values.filter((v) => v !== null && !isNaN(v)));
    return acc;
  }, {});

  const analysisResult = calculateAdvancedStats(
    logicalGroups,
    specTarget,
    document.getElementById("showPairedP")?.checked
  );

  // --- 5. 繪製圖表 ---
  const groupNames = activeGroupsForPlot.map((c) => c.name);
  const colors = activeGroupsForPlot.map((c) => c.color);
  const boxDataArray = activeGroupsForPlot.map((c) =>
    c.values.filter((v) => v !== null && !isNaN(v))
  );

  if (showBox) {
    createPlotlyBoxChart(
      analysisResult,
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
  if (document.getElementById("modeLine").checked)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      document.getElementById("yUnitRight").value || "",
      "charts",
      "line",
      trendConfig
    );
  if (document.getElementById("modeBar").checked)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      document.getElementById("yUnitRight").value || "",
      "charts",
      "bar",
      trendConfig
    );
  if (document.getElementById("modeMixed").checked)
    createPlotlyTrendChart(
      activeGroupsForPlot,
      mainTitle,
      yUnit,
      document.getElementById("yUnitRight").value || "",
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

  // --- 5. 執行進階統計檢定 ---
  if (
    document.getElementById("showPValue")?.checked ||
    document.getElementById("showPairedP")?.checked
  ) {
    const isTwoWay = rawActiveGroups.every((g) => g.name.includes("_"));
    if (isTwoWay && !document.getElementById("showPairedP")?.checked) {
      const allNames = rawActiveGroups.map((g) => g.name.split("_"));
      const extractFactor = (parts, idx) => {
        let levels = parts.map((p) => p[idx] || "");
        let common = "";
        for (let i = 0; i < (levels[0] || "").length; i++) {
          if (levels.every((s) => s[i] === levels[0][i]))
            common += levels[0][i];
          else break;
        }
        return {
          factor: common.trim() || `因子 ${idx + 1}`,
          levels: levels.map((s) => s.replace(common, "").trim() || s),
        };
      };
      const fA = extractFactor(allNames, 0),
        fB = extractFactor(allNames, 1);
      const input = rawActiveGroups.map((g, i) => ({
        f1: fA.levels[i],
        f2: fB.levels[i],
        values: g.values.filter((v) => v != null && !isNaN(v)),
      }));
      renderTwoWayTable(twoWayAnova(input), fA.factor, fB.factor);
      createInteractionPlot(
        input,
        fA.factor,
        fB.factor,
        mainTitle,
        yUnit,
        "charts",
        { fontSize, lineWidth, pointSize, chartHeight, useBold, titleFontSize }
      );
    } else {
      performAdvancedStats(rawActiveGroups, specTarget);
    }
  } else {
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";
  }

  // --- 6. 執行製程能力分析 ---
  if (showCapability) {
    const mode = document.getElementById("subgroupMode").value;
    const size =
      parseInt(document.getElementById("subgroupSizeInput").value) || 1;
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
      if (mode === "column")
        subgroups = rawActiveGroups.map((g) =>
          g.values.filter((v) => v !== null && !isNaN(v))
        );
      else if (mode === "row") {
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
        for (let i = 0; i < allData.length; i += size)
          subgroups.push(allData.slice(i, i + size));
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
        let subgroups = [];
        if (mode === "column") subgroups = [d];
        else {
          for (let i = 0; i < d.length; i += size)
            subgroups.push(d.slice(i, i + size));
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
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollPos);
  });
}

function performAdvancedStats(activeGroups, targetValue) {
  const resultDiv = document.getElementById("statisticsResult");
  const isPairedMode = document.getElementById("showPairedP")?.checked;
  if (!resultDiv) return;

  const logicalGroups = activeGroups.reduce((acc, col) => {
    const prefix = col.name.split("\\")[0].trim(); // 取得 \ 以前的名字
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(...col.values.filter((v) => v !== null && !isNaN(v)));
    return acc;
  }, {});

  const groupNames = Object.keys(logicalGroups); // 這裡的 groupNames 已經是 [大名A, 大名B, ...]

  // 使用合併後的邏輯群組進行計算
  const analysis = calculateAdvancedStats(
    logicalGroups,
    targetValue,
    isPairedMode
  );

  if (!analysis.type || groupNames.length === 0) {
    resultDiv.innerHTML = "";
    resultDiv.style.display = "none";
    return;
  }

  // --- 1. 輔助工具定義 ---
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) =>
    p < 0.05
      ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著差異</span>`
      : `<span style="color:#7f8c8d;">不顯著</span>`;

  const getFCritHelper = (df1, df2) => {
    if (typeof fCDF !== "function" || df1 <= 0 || df2 <= 0) return "---";
    let low = 0,
      high = 1000;
    for (let i = 0; i < 20; i++) {
      let mid = (low + high) / 2;
      if (1 - fCDF(mid, df1, df2) > 0.05) low = mid;
      else high = mid;
    }
    return high.toFixed(4);
  };

  // --- 2. 核心計算邏輯 (先確定 finalP, testMethodName, diagInfo) ---
  // --- 2. 核心計算邏輯 ---
  let finalP = 0;
  let testMethodName = "";
  let diagInfo = "";
  let resA = null;

  // --- 修改後的 ANOVA 處理邏輯 ---
  // 在 main.js 的 performAdvancedStats 函數內找到 ANOVA 部分：
  if (analysis.type === "ANOVA") {
    const groupsArr = groupNames.map((n) => logicalGroups[n]);
    const levA = leveneTest(groupsArr); // 變異數齊性檢定
    const useWelch = !levA.isHomogeneous;

    // 1. 執行對應的 ANOVA
    resA = useWelch ? welchAnova(groupsArr) : analysis.data;
    testMethodName = useWelch ? "Welch's ANOVA" : "One-way ANOVA";
    finalP = resA.p;

    diagInfo = `<span style="font-size: 16px; color: #666;"> (Levene P: ${levA.p.toFixed(
      4
    )}，判定：${levA.isHomogeneous ? "齊一" : "不齊一"})</span>`;

    // 2. 根據變異數狀態選擇事後檢定路徑
    if (finalP < 0.05) {
      if (useWelch) {
        // 變異數不齊一 -> 使用 Games-Howell
        analysis.postHoc = runPostHocGamesHowell(groupsArr, groupNames);
        analysis.postHocTitle = "🔍 事後檢定 (Games-Howell)";
      } else {
        // 變異數齊一 -> 使用 Tukey HSD
        const currentMSW = analysis.data.ssw / analysis.data.df2;
        analysis.postHoc = runPostHocTukey(
          groupsArr,
          groupNames,
          currentMSW,
          analysis.data.df2
        );
        analysis.postHocTitle = "🔍 事後檢定 (Tukey HSD)";
      }
    }
  }

  const pValStr = finalP < 0.0001 ? "< 0.0001" : finalP.toFixed(5);
  const isSignificant = finalP < 0.05;

  // --- 3. 建立專業卡片樣式 HTML (對齊圖片) ---
  let html = `
    <div style="margin: 40px auto; max-width: 95%; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #e0e0e0; font-family: 'Calibri', 'Microsoft JhengHei', sans-serif; text-align:left;">
        
        <div style="display: flex; align-items: center; border-bottom: 4px solid #1f4e78; padding-bottom: 15px; margin-bottom: 20px;">
            <span style="font-size: 32px; margin-right: 12px;">📊</span>
            <h2 style="margin:0; color: #1f4e78; font-size: 32px;">
                統計分析報告 <span style="font-size: 24px; font-weight: normal; color: #555;">(Statistical Analysis Report)</span>
            </h2>
        </div>
        ...
  `;

  // --- 4. 生成數據表格 ---
  switch (analysis.type) {
    case "ANOVA":
      html += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 22px;">
            <thead>
                <tr style="background: #f8f9fa; border-top: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">變異來源</th>
                    <th style="padding: 12px; text-align: center;">SS</th>
                    <th style="padding: 12px; text-align: center;">df</th>
                    <th style="padding: 12px; text-align: center;">MS</th>
                    <th style="padding: 12px; text-align: center;">F</th>
                    <th style="padding: 12px; text-align: center;">P-value</th>
                    <th style="padding: 12px; text-align: center;">F crit</th>
                    <th style="padding: 12px; text-align: center;">判定</th>
                </tr>
            </thead>
            <tbody>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">組間 (Between)</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      analysis.data.ssb
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${
                      resA.df1
                    }</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      analysis.data.ssb / resA.df1
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.F
                    )}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${pValStr}</td>
                    <td style="padding: 12px; text-align: center;">${getFCritHelper(
                      resA.df1,
                      resA.df2
                    )}</td>
                    <td style="padding: 12px; text-align: center; color: ${
                      isSignificant ? "#c0392b" : "#2ecc71"
                    }; font-weight: bold;">${getFlag(finalP)}</td>
                </tr>
                <tr style="background: #fafafa;">
                    <td style="padding: 12px;">組內 (Within)</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      analysis.data.ssw
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${resA.df2.toFixed(
                      1
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      analysis.data.ssw / resA.df2
                    )}</td>
                    <td colspan="4" style="padding: 12px; text-align: center; color: #7f8c8d;">誤差項</td>
                </tr>
            </tbody>
        </table>`;
      break;

    case "PAIRED_T":
    case "INDEPENDENT_T":
      html += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 22px;">
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
                    <td style="padding: 12px;">${groupNames.join(" vs ")}</td>
                    <td style="padding: 12px; text-align: center;">${formatVal(
                      resA.t
                    )}</td>
                    <td style="padding: 12px; text-align: center;">${resA.df.toFixed(
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

  // --- 5. 生成分析結論區塊 ---
  html += `
        <div style="background: #f1f6f9; border-left: 6px solid #2980b9; padding: 20px; border-radius: 0 4px 4px 0; margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #1f4e78; font-size: 26px; display: flex; align-items: center;">
                <span style="margin-right: 10px;">📝</span> 分析結論：
            </h3>
            <p style="margin: 0; font-size: 24px; line-height: 1.6; color: #333;">
                檢定 P-Value 為 <b style="font-size: 26px;">${pValStr}</b>。在 α=0.05 顯著水準下，
                ${
                  isSignificant
                    ? `<span style="color:#c0392b; font-weight:bold;">拒絕虛無假設</span>。結果顯示不同組別之間存在顯著差異，建議檢查製程。`
                    : `<span style="color:#2ecc71; font-weight:bold;">無法拒絕虛無假設</span>。目前數據不足以證明組別之間存在顯著差異。`
                }
            </p>
        </div>
    </div>`; // 結束卡片容器

  // --- 6. 處理 Tukey HSD 事後檢定 (若有) ---
  if (analysis.postHoc && analysis.postHoc.length > 0) {
    html += `
      <div style="margin: 20px auto; max-width: 95%; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #e0e0e0; font-family: 'Microsoft JhengHei';">
        <h3 style="color: #1f4e78; border-bottom: 3px solid #2980b9; padding-bottom: 10px; font-size: 28px;">${analysis.postHocTitle}</h3>
        <table style="width:100%; border-collapse: collapse; margin-top:15px; font-size:22px;">
            <thead><tr style="background:#f8f9fa; border-bottom:2px solid #dee2e6;"><td>比較對象</td><td style="text-align:center;">差異值</td><td style="text-align:center;">Q 統計量</td><td style="text-align:center;">判定</td></tr></thead>
            <tbody>`;
    analysis.postHoc.forEach((ph) => {
      html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding:10px;">${
        ph.pair
      }</td><td style="text-align:center;">${
        ph.diff
      }</td><td style="text-align:center;">${ph.qValue} (臨界:${
        ph.qCrit
      })</td><td style="text-align:center;">${
        ph.isSignificant ? '<b style="color:#c0392b;">🚩 顯著</b>' : "不顯著"
      }</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // --- 7. 最後渲染 ---
  resultDiv.style.display = "block";
  resultDiv.innerHTML = html;
}
function autoGroupColoring() {
  const groupMap = {};
  let baseColors = [
    "#1F77B4",
    "#FF7F0E",
    "#2CA02C",
    "#D62728",
    "#9467BD",
    "#8C564B",
    "#E377C2",
    "#7F7F7F",
    "#BCBD22",
    "#17BECF",
    "#003F5C",
    "#DE425B",
    "#488F31",
    "#6050DC",
    "#B33016",
    "#00A3AD",
    "#8A2BE2",
    "#FFA600",
    "#58508D",
    "#BC5090",
    "#00D2D3",
    "#54A0FF",
    "#5F27CD",
    "#EE5253",
    "#01A3A4",
    "#FF9F43",
    "#10AC84",
    "#222F3E",
    "#F368E0",
    "#FF6B6B",
  ];
  for (let i = baseColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baseColors[i], baseColors[j]] = [baseColors[j], baseColors[i]];
  }
  let colorIdx = 0;
  columnsData.forEach((col) => {
    if (col.isSequence) return;
    const prefix = col.name.split("\\")[0].trim();
    if (!groupMap[prefix]) {
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
  const formatP = (p) =>
    p < 0.05
      ? `<b style="color:#c0392b;">${
          p < 0.0001 ? "&lt; 0.0001" : p.toFixed(5)
        }</b>`
      : p.toFixed(5);
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) =>
    p < 0.05
      ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著</span>`
      : `<span style="color:#7f8c8d;">不顯著</span>`;

  const getFCrit = (df1, df2) => {
    if (typeof fCDF !== "function" || df1 <= 0 || df2 <= 0) return "---";
    let low = 0,
      high = 1000;
    for (let i = 0; i < 20; i++) {
      let mid = (low + high) / 2;
      if (1 - fCDF(mid, df1, df2) > 0.05) low = mid;
      else high = mid;
    }
    return high.toFixed(4);
  };

  const msA = res.factorA.f * res.error.ms,
    msB = res.factorB.f * res.error.ms,
    msAB = res.interaction.f * res.error.ms;
  const tableHeaderStyle =
    "background:#f2f2f2; border:1px solid #d1d3d1; padding:15px; font-weight:bold; font-size:24px;";
  const tableCellStyle =
    "border:1px solid #d1d3d1; padding:15px; font-size:24px;";

  let html = `<div style='font-family: "Calibri", "Microsoft JhengHei", sans-serif; padding:40px; background:#fff;'>`;
  html += `<h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; font-size: 32px; margin-bottom: 20px;">📊 雙因子變異數分析報告</h2>`;
  html += `<table style="width:100%; border-collapse: collapse; margin-top:20px;">
      <thead><tr style="${tableHeaderStyle}"><td>來源</td><td>SS</td><td>df</td><td>MS</td><td>F</td><td>P-value</td><td>F crit</td><td>判定</td></tr></thead>
      <tbody>
        <tr><td style="${tableCellStyle}">${nameA}</td><td style="${tableCellStyle}">${formatVal(
    msA * res.factorA.df
  )}</td><td style="${tableCellStyle}">${
    res.factorA.df
  }</td><td style="${tableCellStyle}">${formatVal(
    msA
  )}</td><td style="${tableCellStyle}">${formatVal(
    res.factorA.f
  )}</td><td style="${tableCellStyle}">${formatP(
    res.factorA.p
  )}</td><td style="${tableCellStyle}">${getFCrit(
    res.factorA.df,
    res.error.df
  )}</td><td style="${tableCellStyle}">${getFlag(res.factorA.p)}</td></tr>
        <tr><td style="${tableCellStyle}">${nameB}</td><td style="${tableCellStyle}">${formatVal(
    msB * res.factorB.df
  )}</td><td style="${tableCellStyle}">${
    res.factorB.df
  }</td><td style="${tableCellStyle}">${formatVal(
    msB
  )}</td><td style="${tableCellStyle}">${formatVal(
    res.factorB.f
  )}</td><td style="${tableCellStyle}">${formatP(
    res.factorB.p
  )}</td><td style="${tableCellStyle}">${getFCrit(
    res.factorB.df,
    res.error.df
  )}</td><td style="${tableCellStyle}">${getFlag(res.factorB.p)}</td></tr>
        <tr><td style="${tableCellStyle}">交互作用</td><td style="${tableCellStyle}">${formatVal(
    msAB * res.interaction.df
  )}</td><td style="${tableCellStyle}">${
    res.interaction.df
  }</td><td style="${tableCellStyle}">${formatVal(
    msAB
  )}</td><td style="${tableCellStyle}">${formatVal(
    res.interaction.f
  )}</td><td style="${tableCellStyle}">${formatP(
    res.interaction.p
  )}</td><td style="${tableCellStyle}">${getFCrit(
    res.interaction.df,
    res.error.df
  )}</td><td style="${tableCellStyle}">${getFlag(res.interaction.p)}</td></tr>
        <tr style="background:#fafafa;"><td style="${tableCellStyle}">誤差</td><td style="${tableCellStyle}">${formatVal(
    res.error.ms * res.error.df
  )}</td><td style="${tableCellStyle}">${
    res.error.df
  }</td><td style="${tableCellStyle}">${formatVal(
    res.error.ms
  )}</td><td colspan="4" style="${tableCellStyle}">---</td></tr>
      </tbody></table></div>`;
  resultDiv.style.display = "block";
  resultDiv.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
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
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      lastClickedPoint &&
      document.activeElement.tagName !== "INPUT"
    ) {
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
    } catch (e) {}
  });
});
