/**
 * main.js - 完整版控制中心 (修正變數一致性)
 */
function go() {
  const scrollPos = window.scrollY;

  // --- 1. 清理舊圖表 ---
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

  // --- 2. 數據與配置 ---
  const config = ConfigManager.get();
  const rawActiveGroups = columnsData.filter(
    (c) => !c.isSequence && c.values.some((v) => v !== null && !isNaN(v))
  );
  if (rawActiveGroups.length === 0) return;

  // --- 3. 數據處理 ---
  let activeGroupsForPlot = rawActiveGroups;
  const totalCount = rawActiveGroups.reduce(
    (s, g) => s + g.values.filter((v) => v != null && !isNaN(v)).length,
    0
  );
  if (totalCount > 1000) {
    activeGroupsForPlot = rawActiveGroups.map((group) => {
      const valid = group.values.filter((v) => v != null && !isNaN(v));
      if (valid.length > 40) {
        const step = Math.ceil(valid.length / 40);
        return { ...group, values: valid.filter((_, i) => i % step === 0) };
      }
      return group;
    });
  }

  const logicalGroups = rawActiveGroups.reduce((acc, col) => {
    const prefix = col.name.split("\\")[0].trim();
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(...col.values.filter((v) => v !== null && !isNaN(v)));
    return acc;
  }, {});

  // --- 4. 統計分析 (變數統一定義為 analysis) ---
  const analysis = StatsEngine.analyze(
    logicalGroups,
    config.spec.target,
    config.modes.isPaired
  );

  // --- 5. 繪製圖表 ---
  if (config.modes.showBox) {
    createPlotlyBoxChart(
      analysis, // 這裡傳入算好的數據
      activeGroupsForPlot.map((g) => g.values),
      activeGroupsForPlot.map((g) => g.name),
      activeGroupsForPlot.map((g) => g.color),
      config.mainTitle,
      config.yUnitLeft,
      "charts",
      config.fontSize,
      config.visuals.lineWidth,
      config.visuals.pointSize,
      config.yMin,
      config.yMax,
      config.yStep,
      config.visuals.exX,
      config.visuals.mmX,
      config.modes.showOutliers,
      config.modes.showAllPoints,
      config.statFontSize,
      config.visuals.chartHeight,
      config.visuals.boxGap,
      config.titleFontSize
    );
  }

  // --- 6. 統計分析報告渲染 (修正處) ---
  if (config.modes.showPValue) {
    resultDiv.style.display = "block";
    // 呼叫你在 chartRenderer.js 結尾定義的新函數
    if (typeof renderStatisticalReport === "function") {
      renderStatisticalReport(analysis);
    }
  } else {
    resultDiv.style.display = "none";
  }

  // --- 7. 製程能力分析 ---
  if (config.modes.showCapability) {
    executeCapabilityLogic(rawActiveGroups, config, container);
  }

  requestAnimationFrame(() => window.scrollTo(0, scrollPos));
}

// 輔助函式
// 修正後的製程能力邏輯
function executeCapabilityLogic(rawActiveGroups, config, container) {
  // 建立對接舊函數的設定物件
  const capCfg = {
    LSL: config.spec.lsl,
    USL: config.spec.usl,
    Target: config.spec.target,
    specColor: config.spec.color,
    specStyle: config.spec.style,
    fontBaseSize: config.fontSize, // 確保基礎字體被傳入
    lineWidth: config.visuals.lineWidth,
    step: config.yStep,
  };

  if (config.modes.combineGroups) {
    // 全域合併模式
    const allData = rawActiveGroups.flatMap((g) =>
      g.values.filter((v) => v != null && !isNaN(v))
    );
    if (allData.length >= 2) {
      renderCapabilityReport(
        container,
        allData,
        [allData],
        config.mainTitle + " (Global)",
        capCfg
      );
    }
  } else {
    // 個別欄位模式
    rawActiveGroups.forEach((g) => {
      const d = g.values.filter((v) => v != null && !isNaN(v));
      // 至少要有 2 個數據才能計算標準差
      if (d.length >= 2) {
        renderCapabilityReport(container, d, [d], g.name, capCfg);
      }
    });
  }
}

// --- main.js 底部修正 ---
document.addEventListener("DOMContentLoaded", () => {
  // 定義需要「即時變動」的欄位 (輸入文字或數字時立即觸發)
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
    "extremeXOffsetInput", // 加入這行
    "meanMedianXOffsetInput", // 加入這行
    "statFontSize",
    "chartHeight",
    "boxGap", // 加入這行
  ];

  realTimeInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        // 使用 debounce 避免頻繁更新導致卡頓
        clearTimeout(window.rtTimeout);
        window.rtTimeout = setTimeout(go, 20); // 50ms 後執行生成圖表
      });
    }
  });

  // 定義需要「狀態變更」時觸發的欄位 (勾選框、下拉選單)
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
    }
  });

  initTable();
  loadSettings();
  if (!localStorage.getItem("chart_34_4_settings")) go();

  // 離群值刪除快捷鍵邏輯
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
