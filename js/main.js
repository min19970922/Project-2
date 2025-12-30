function go() {
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

  const mainTitle = document.getElementById("mainTitle").value || "圖表";
  const titleFontSize = parseInt(document.getElementById("titleFontSize").value) || 48;
  const yUnit = document.getElementById("yUnitLeft").value;
  const fontSize = parseInt(document.getElementById("fontSize").value) || 16;
  const statFontSize = parseInt(document.getElementById("statFontSize").value) || fontSize;
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
  const chartHeight = parseInt(document.getElementById("chartHeight").value) || 600;
  const boxGap = parseFloat(document.getElementById("boxGap").value) || 0.3;
  const exX = parseInt(document.getElementById("extremeXOffsetInput").value) || 32;
  const mmX = parseInt(document.getElementById("meanMedianXOffsetInput").value) || 25;

  const groupNames = activeGroupsForPlot.map((c) => c.name);
  const colors = activeGroupsForPlot.map((c) => c.color);
  const boxDataArray = activeGroupsForPlot.map((c) =>
    c.values.filter((v) => v !== null && !isNaN(v))
  );

  if (showBox) {
    createPlotlyBoxChart(
      boxDataArray, groupNames, colors, mainTitle, yUnit, "charts",
      fontSize, lineWidth, pointSize, yMin, yMax, yStep, exX, mmX,
      document.getElementById("showOutliers").checked,
      document.getElementById("showAllPoints").checked,
      statFontSize, chartHeight, boxGap, titleFontSize
    );
  }

  const trendConfig = { fontSize, lineWidth, pointSize, chartHeight, useBold, titleFontSize, colors, boxGap };
  if (document.getElementById("modeLine").checked)
    createPlotlyTrendChart(activeGroupsForPlot, mainTitle, yUnit, document.getElementById("yUnitRight").value || "", "charts", "line", trendConfig);
  if (document.getElementById("modeBar").checked)
    createPlotlyTrendChart(activeGroupsForPlot, mainTitle, yUnit, document.getElementById("yUnitRight").value || "", "charts", "bar", trendConfig);
  if (document.getElementById("modeMixed").checked)
    createPlotlyTrendChart(activeGroupsForPlot, mainTitle, yUnit, document.getElementById("yUnitRight").value || "", "charts", "mixed", trendConfig);

  if (showDot) {
    const dotData = activeGroupsForPlot.map((g) => ({ label: g.name, values: g.values.filter((v) => v !== null && !isNaN(v)) }));
    createClassicDotPlot(dotData, colors, mainTitle, yUnit, container, fontSize, yStep, document.getElementById("showGrid").checked, lineWidth, useBold, chartHeight, titleFontSize);
  }

  if (document.getElementById("showPValue")?.checked || document.getElementById("showPairedP")?.checked) {
    const isTwoWay = rawActiveGroups.every((g) => g.name.includes("_"));
    if (isTwoWay && !document.getElementById("showPairedP")?.checked) {
      const allNames = rawActiveGroups.map(g => g.name.split("_"));
      const extractFactorAndLevels = (nameParts, index) => {
        const levels = nameParts.map(p => p[index] || "");
        let firstStr = levels[0] || "";
        let commonPrefix = "";
        for (let i = 0; i < firstStr.length; i++) {
          let char = firstStr[i];
          if (levels.every(s => s[i] === char)) commonPrefix += char; else break;
        }
        return { factor: commonPrefix.trim() || `因子 ${index + 1}`, cleanLevels: levels.map(s => s.replace(commonPrefix, "").trim() || s) };
      };
      const resA = extractFactorAndLevels(allNames, 0);
      const resB = extractFactorAndLevels(allNames, 1);
      const twoWayInput = rawActiveGroups.map((g, idx) => ({ f1: resA.cleanLevels[idx], f2: resB.cleanLevels[idx], values: g.values.filter((v) => v !== null && !isNaN(v)) }));
      renderTwoWayTable(twoWayAnova(twoWayInput), resA.factor, resB.factor);
      createInteractionPlot(twoWayInput, resA.factor, resB.factor, mainTitle, yUnit, "charts", { fontSize, lineWidth, pointSize, chartHeight, useBold, titleFontSize });
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
    const size = parseInt(document.getElementById("subgroupSizeInput").value) || 1;
    const capConfig = { LSL: specLSL, USL: specUSL, Target: specTarget, specColor: specLineColor, specStyle: specLineStyle, fontBaseSize: fontSize, lineWidth: lineWidth, step: yStep };
    if (combineGroups) {
      const allData = rawActiveGroups.flatMap((g) => g.values.filter((v) => v !== null && !isNaN(v)));
      let subgroups = [];
      if (mode === "column") subgroups = rawActiveGroups.map((g) => g.values.filter((v) => v !== null && !isNaN(v)));
      else if (mode === "row") {
        let maxLen = Math.max(...rawActiveGroups.map((g) => g.values.length));
        for (let i = 0; i < maxLen; i++) {
          let row = [];
          rawActiveGroups.forEach((g) => { if (g.values[i] != null && !isNaN(g.values[i])) row.push(g.values[i]); });
          if (row.length > 0) subgroups.push(row);
        }
      } else { for (let i = 0; i < allData.length; i += size) subgroups.push(allData.slice(i, i + size)); }
      renderCapabilityReport(container, allData, subgroups, mainTitle + " (Global)", capConfig);
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
            if (parts.length === 3) { if (parts[1]) localConfig.Target = parseFloat(parts[1]); if (parts[2]) localConfig.USL = parseFloat(parts[2]); }
            else if (parts.length === 2) { if (parts[1]) localConfig.USL = parseFloat(parts[1]); localConfig.Target = NaN; }
          }
        }
        let subgroups = [];
        if (mode === "column") subgroups = [d]; else { for (let i = 0; i < d.length; i += size) subgroups.push(d.slice(i, i + size)); }
        renderCapabilityReport(container, d, subgroups, displayName, localConfig);
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

  let finalP = 0;
  let testMethodName = "";

  const formatP = (p) => {
    if (p < 0.0001) return `<b style="color:#c0392b;">&lt; 0.0001</b>`;
    const pStr = p.toFixed(5);
    return p < 0.05 ? `<b style="color:#c0392b;">${pStr}</b>` : pStr;
  };
  const getTCritHelper = (df, alpha = 0.05, tails = 2) => {
    if (typeof tCDF !== 'function') return "---";
    let target = tails === 2 ? 1 - alpha / 2 : 1 - alpha;
    let low = 0, high = 100; // T值通常在此範圍
    for (let i = 0; i < 20; i++) { // 二分搜尋提高精度
      let mid = (low + high) / 2;
      if (tCDF(mid, df) < target) low = mid; else high = mid;
    }
    return high.toFixed(4);
  };
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) => (p < 0.05 ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著差異</span>` : `<span style="color:#7f8c8d;">不顯著</span>`);
  const getFCritHelper = (df1, df2) => {
    if (typeof fCDF !== 'function') return "---";
    let low = 0, high = 1000;
    for (let i = 0; i < 20; i++) { let mid = (low + high) / 2; if (1 - fCDF(mid, df1, df2) > 0.05) low = mid; else high = mid; }
    return high.toFixed(4);
  };

  const tableHeaderStyle = "background:#f2f2f2; border:1px solid #d1d3d1; padding:15px; text-align:left; font-weight:bold; font-size:24px;";
  const tableCellStyle = "border:1px solid #d1d3d1; padding:15px; font-size:24px;";

  let html = `<div style='font-family: "Calibri", "Microsoft JhengHei", sans-serif; color: #333;'>`;
  html += `<h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; padding-bottom: 12px; font-size: 28px; margin-bottom: 20px;">📊 統計分析報告</h2>`;

  switch (analysis.type) {
    case "ONE_SAMPLE_T":
      testMethodName = "單一樣本 T 檢定";
      finalP = analysis.data.p;
      html += `<p style="font-size: 24px;">檢定類型：<b>${testMethodName}</b></p>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr style="${tableHeaderStyle}"><td>檢定項</td><td>N</td><td>平均值</td><td>目標值</td><td>T</td><td>df</td><td>P-Value</td><td>判定</td></tr></thead>
          <tbody><tr>
            <td style="${tableCellStyle}">${groupNames[0]}</td><td style="${tableCellStyle}">${analysis.data.n}</td>
            <td style="${tableCellStyle}">${formatVal(analysis.data.mean)}</td><td style="${tableCellStyle}">${targetValue}</td>
            <td style="${tableCellStyle}">${formatVal(analysis.data.t)}</td><td style="${tableCellStyle}">${analysis.data.df}</td>
            <td style="${tableCellStyle}">${formatP(analysis.data.p)}</td><td style="${tableCellStyle}">${getFlag(analysis.data.p)}</td>
          </tr></tbody></table>`;
      break;

    case "PAIRED_T":
    case "INDEPENDENT_T":
      const d1 = logicalGroups[groupNames[0]], d2 = logicalGroups[groupNames[1]];
      if (analysis.type === "PAIRED_T") {
        testMethodName = "成對樣本 T 檢定";
        finalP = analysis.data.p;
      } else {
        const lev = leveneTest([d1, d2]);
        const tRes = independentTTest(d1, d2, lev.isHomogeneous);
        testMethodName = lev.isHomogeneous ? "獨立樣本 T 檢定 (等變異)" : "Welch's T 檢定 (不等變異)";
        analysis.data = tRes;
        finalP = tRes.p;
        html += `<p style="font-size: 20px; color: #666;">變異數齊一性檢定Levene's Test (Brown-Forsythe) P: ${lev.p.toFixed(4)}，判定：${lev.isHomogeneous ? '齊一' : '不齊一'}</p>`;
      }
      const pTwoTailed = analysis.data.p;
      const pOneTailed = pTwoTailed / 2; // 單尾 P 值為雙尾的一半
      html += `<p style="font-size: 24px;">檢定類型：<b>${testMethodName}</b></p>
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="${tableHeaderStyle}">
          <td>比較組別</td>
          <td>T 統計量</td>
          <td>df</td>
          <td>單尾 P-Value</td>
          <td>雙尾 P-Value</td>
          <td>判定 (雙尾)</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tableCellStyle}">${groupNames[0]} vs ${groupNames[1]}</td>
          <td style="${tableCellStyle}">${formatVal(analysis.data.t)}</td>
          <td style="${tableCellStyle}">${analysis.data.df.toFixed(2)}</td>
          <td style="${tableCellStyle}">${formatP(pOneTailed)}</td>
          <td style="${tableCellStyle}">${formatP(pTwoTailed)}</td>
          <td style="${tableCellStyle}">${getFlag(pTwoTailed)}</td>
        </tr>
      </tbody>
    </table>`;
      break;

    case "ANOVA":
      const groupsArr = groupNames.map(n => logicalGroups[n]);
      const levA = leveneTest(groupsArr); // 執行變異數齊一性檢定
      const useWelch = !levA.isHomogeneous; // 判定是否不齊一
      const resA = useWelch ? welchAnova(groupsArr) : analysis.data; // 選擇對應檢定方法

      testMethodName = useWelch ? "Welch's ANOVA" : "One-way ANOVA";
      finalP = resA.p;

      // 組合顯示標題與診斷資訊
      html += `<p style="font-size: 24px;">檢定類型：<b>${testMethodName}</b> 
               <span style="font-size: 20px; color: #666;">
               (變異數齊一性檢定 Levene's Test (Brown-Forsythe) P: ${levA.p.toFixed(4)}，
               判定：${levA.isHomogeneous ? '齊一' : '不齊一'})</span></p>
        <table style="width:100%; border-collapse: collapse;">
          <thead><tr style="${tableHeaderStyle}"><td>變異來源</td><td>SS</td><td>df</td><td>MS</td><td>F</td><td>P-value</td><td>F crit</td><td>判定</td></tr></thead>
          <tbody>
            <tr>
              <td style="${tableCellStyle}">組間</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssb)}</td>
              <td style="${tableCellStyle}">${analysis.data.df1}</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssb / analysis.data.df1)}</td>
              <td style="${tableCellStyle}">${formatVal(resA.F)}</td>
              <td style="${tableCellStyle}">${formatP(resA.p)}</td>
              <td style="${tableCellStyle}">${getFCritHelper(resA.df1, resA.df2)}</td>
              <td style="${tableCellStyle}">${getFlag(resA.p)}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="${tableCellStyle}">組內</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssw)}</td>
              <td style="${tableCellStyle}">${analysis.data.df2}</td>
              <td style="${tableCellStyle}">${formatVal(analysis.data.ssw / analysis.data.df2)}</td>
              <td colspan="4" style="${tableCellStyle}">---</td>
            </tr>
          </tbody>
        </table>`;
      break;
  }

  // 事後檢定顯示邏輯
  if (analysis.postHoc && analysis.postHoc.length > 0) {
    html += `<h3 style="color: #1f4e78; margin-top:20px;">🔍 事後檢定 (Tukey HSD)</h3>
      <table style="width:100%; border-collapse: collapse;">
        <thead><tr style="${tableHeaderStyle}"><td>比較對象</td><td>差異值</td><td>Q 統計量</td><td>判定</td></tr></thead>
        <tbody>`;
    analysis.postHoc.forEach(ph => {
      html += `<tr><td style="${tableCellStyle}">${ph.pair}</td><td style="${tableCellStyle}">${ph.diff}</td>
        <td style="${tableCellStyle}">${ph.qValue} (臨界:${ph.qCrit})</td><td style="${tableCellStyle}">${ph.isSignificant ? '🚩 顯著' : '不顯著'}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `<div style="margin-top:30px; padding:25px; background:#f4f7f9; border-left:10px solid #2980b9;">
            <b style="font-size:28px; color:#1f4e78;">📝 分析結論：</b><br>
            <p style="margin-top:15px; line-height:1.8; font-size:24px;">
              檢定 P-Value 為 <b>${finalP.toFixed(5)}</b>。在 α=0.05 顯著水準下，
              ${finalP < 0.05 ? `<span style="color:#c0392b;"><b>拒絕虛無假設</b>。組別間存在顯著差異。</span>` : `<span><b>無法拒絕虛無假設</b>。組別間無顯著差異。</span>`}
            </p></div></div>`;
  resultDiv.style.display = "block";
  resultDiv.innerHTML = html;
}

function autoGroupColoring() {
  const groupMap = {};
  let baseColors = ["#1F77B4", "#FF7F0E", "#2CA02C", "#D62728", "#9467BD", "#8C564B", "#E377C2", "#7F7F7F", "#BCBD22", "#17BECF", "#003F5C", "#DE425B", "#488F31", "#6050DC", "#B33016", "#00A3AD", "#8A2BE2", "#FFA600", "#58508D", "#BC5090", "#00D2D3", "#54A0FF", "#5F27CD", "#EE5253", "#01A3A4", "#FF9F43", "#10AC84", "#222F3E", "#F368E0", "#FF6B6B"];
  for (let i = baseColors.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[baseColors[i], baseColors[j]] = [baseColors[j], baseColors[i]]; }
  let colorIdx = 0;
  columnsData.forEach((col) => {
    if (col.isSequence) return;
    const prefix = col.name.split("/")[0].trim();
    if (!groupMap[prefix]) { groupMap[prefix] = baseColors[colorIdx % baseColors.length]; colorIdx++; }
    col.color = groupMap[prefix];
  });
  renderTable(); go();
}

function renderTwoWayTable(res, nameA, nameB) {
  const resultDiv = document.getElementById("statisticsResult");
  if (!resultDiv) return;
  const formatP = (p) => p < 0.05 ? `<b style="color:#c0392b;">${p < 0.0001 ? '&lt; 0.0001' : p.toFixed(5)}</b>` : p.toFixed(5);
  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const getFlag = (p) => p < 0.05 ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著</span>` : `<span style="color:#7f8c8d;">不顯著</span>`;
  const getFCrit = (df1, df2) => {
    let low = 0, high = 1000;
    for (let i = 0; i < 20; i++) { let mid = (low + high) / 2; if (1 - fCDF(mid, df1, df2) > 0.05) low = mid; else high = mid; }
    return high.toFixed(4);
  };
  const msA = res.factorA.f * res.error.ms, msB = res.factorB.f * res.error.ms, msAB = res.interaction.f * res.error.ms;
  const tableHeaderStyle = "background:#f2f2f2; border:1px solid #d1d3d1; padding:15px; font-weight:bold; font-size:24px;";
  const tableCellStyle = "border:1px solid #d1d3d1; padding:15px; font-size:24px;";
  let html = `<div style='font-family: "Calibri", "Microsoft JhengHei", sans-serif; padding:40px; background:#fff;'>`;
  html += `<h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; font-size: 28px;">📊 雙因子變異數分析報告</h2>`;
  html += `<table style="width:100%; border-collapse: collapse; margin-top:20px;">
      <thead><tr style="${tableHeaderStyle}"><td>來源</td><td>SS</td><td>df</td><td>MS</td><td>F</td><td>P-value</td><td>F crit</td><td>判定</td></tr></thead>
      <tbody>
        <tr><td style="${tableCellStyle}">${nameA}</td><td style="${tableCellStyle}">${formatVal(msA * res.factorA.df)}</td><td style="${tableCellStyle}">${res.factorA.df}</td><td style="${tableCellStyle}">${formatVal(msA)}</td><td style="${tableCellStyle}">${formatVal(res.factorA.f)}</td><td style="${tableCellStyle}">${formatP(res.factorA.p)}</td><td style="${tableCellStyle}">${getFCrit(res.factorA.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.factorA.p)}</td></tr>
        <tr><td style="${tableCellStyle}">${nameB}</td><td style="${tableCellStyle}">${formatVal(msB * res.factorB.df)}</td><td style="${tableCellStyle}">${res.factorB.df}</td><td style="${tableCellStyle}">${formatVal(msB)}</td><td style="${tableCellStyle}">${formatVal(res.factorB.f)}</td><td style="${tableCellStyle}">${formatP(res.factorB.p)}</td><td style="${tableCellStyle}">${getFCrit(res.factorB.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.factorB.p)}</td></tr>
        <tr><td style="${tableCellStyle}">交互作用</td><td style="${tableCellStyle}">${formatVal(msAB * res.interaction.df)}</td><td style="${tableCellStyle}">${res.interaction.df}</td><td style="${tableCellStyle}">${formatVal(msAB)}</td><td style="${tableCellStyle}">${formatVal(res.interaction.f)}</td><td style="${tableCellStyle}">${formatP(res.interaction.p)}</td><td style="${tableCellStyle}">${getFCrit(res.interaction.df, res.error.df)}</td><td style="${tableCellStyle}">${getFlag(res.interaction.p)}</td></tr>
        <tr style="background:#fafafa;"><td style="${tableCellStyle}">誤差</td><td style="${tableCellStyle}">${formatVal(res.error.ms * res.error.df)}</td><td style="${tableCellStyle}">${res.error.df}</td><td style="${tableCellStyle}">${formatVal(res.error.ms)}</td><td colspan="4" style="${tableCellStyle}">---</td></tr>
      </tbody></table></div>`;
  resultDiv.style.display = "block";
  resultDiv.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  const realTimeInputs = ["fontSize", "titleFontSize", "lineWidth", "pointSize", "specLSL", "specUSL", "specTarget", "yMinLeft", "yMaxLeft", "yStepLeft", "subgroupSizeInput", "extremeXOffsetInput", "meanMedianXOffsetInput", "statFontSize", "chartHeight", "boxGap"];
  realTimeInputs.forEach((id) => { document.getElementById(id)?.addEventListener("input", () => { clearTimeout(window.rtTimeout); window.rtTimeout = setTimeout(go, 20); }); });
  const changeInputs = ["specLineColor", "specLineStyle", "showBox", "modeLine", "modeBar", "modeMixed", "showDot", "yUnitRight", "showOutliers", "showAllPoints", "showMean", "showMedian", "showExtremes", "showGrid", "useBoldFont", "showCapability", "combineGroups", "subgroupMode", "stdDevMethod", "showPValue", "showPairedP"];
  changeInputs.forEach((id) => { const el = document.getElementById(id); if (el) { el.addEventListener("change", go); if (el.type !== "checkbox") el.addEventListener("input", go); } });
  initTable(); loadSettings(); if (!localStorage.getItem("chart_34_4_settings")) go();
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && lastClickedPoint && document.activeElement.tagName !== "INPUT") {
      e.preventDefault(); deleteOutlierPoint(lastClickedPoint.groupName, lastClickedPoint.value); lastClickedPoint = null;
    }
  });
});

window.addEventListener("resize", () => { plotlyCharts.forEach((id) => { try { Plotly.Plots.resize(document.getElementById(id)); } catch (e) { } }); });