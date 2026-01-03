/**
 * configManager.js
 * 負責從 UI 介面讀取上百個設定參數並打包成物件，供統計引擎與繪圖器使用。
 */

const ConfigManager = {
  /**
   * 取得所有當前的 UI 配置
   * @returns {Object} 包含標題、樣式、規格、統計、圖表設定的完整物件
   */
  get() {
    // 輔助函式：確保取得數值，若失敗則回傳預設值
    const parseNum = (id, defaultValue) => {
      const val = parseFloat(document.getElementById(id)?.value);
      return isNaN(val) ? defaultValue : val;
    };

    return {
      // --- 基礎文字與字體設定 ---
      mainTitle: document.getElementById("mainTitle")?.value || "圖表",
      titleFontSize: parseNum("titleFontSize", 48),
      fontSize: parseNum("fontSize", 16),
      statFontSize: parseNum("statFontSize", 16),
      useBold: document.getElementById("useBoldFont")?.checked || false,

      // --- 座標軸與單位 ---
      yUnitLeft: document.getElementById("yUnitLeft")?.value || "",
      yUnitRight: document.getElementById("yUnitRight")?.value || "",
      yMin:
        document.getElementById("yMinLeft")?.value === ""
          ? null
          : parseNum("yMinLeft", null),
      yMax:
        document.getElementById("yMaxLeft")?.value === ""
          ? null
          : parseNum("yMaxLeft", null),
      yStep: parseNum("yStepLeft", null),

      // --- 規格線 (Specifications) ---
      spec: {
        lsl: parseNum("specLSL", NaN),
        usl: parseNum("specUSL", NaN),
        target: parseNum("specTarget", NaN),
        color: document.getElementById("specLineColor")?.value || "#e74c3c",
        style: document.getElementById("specLineStyle")?.value || "solid",
      },

      // --- 圖表物理外觀 ---
      visuals: {
        chartHeight: parseNum("chartHeight", 600),
        lineWidth: parseNum("lineWidth", 3),
        pointSize: parseNum("pointSize", 5),
        boxGap: parseNum("boxGap", 0.3),
        showGrid: document.getElementById("showGrid")?.checked || false,
        // 盒鬚圖專用偏移標籤位置
        exX: parseNum("extremeXOffsetInput", 32),
        mmX: parseNum("meanMedianXOffsetInput", 25),
      },

      // --- 功能開關 ---
      modes: {
        showBox: document.getElementById("showBox")?.checked || false,
        showDot: document.getElementById("showDot")?.checked || false,
        showCapability:
          document.getElementById("showCapability")?.checked || false,
        showOutliers: document.getElementById("showOutliers")?.checked || false,
        showAllPoints:
          document.getElementById("showAllPoints")?.checked || false,
        showPValue: document.getElementById("showPValue")?.checked || false,
        isPaired: document.getElementById("showPairedP")?.checked || false,
        combineGroups:
          document.getElementById("combineGroups")?.checked || false,
      },

      // --- 趨勢圖模式 ---
      trendModes: {
        line: document.getElementById("modeLine")?.checked || false,
        bar: document.getElementById("modeBar")?.checked || false,
        mixed: document.getElementById("modeMixed")?.checked || false,
      },

      // --- 製程能力設定 ---
      capability: {
        mode: document.getElementById("subgroupMode")?.value || "auto",
        size: parseNum("subgroupSizeInput", 1),
        stdDevMethod:
          document.getElementById("stdDevMethod")?.value || "pooled",
      },
    };
  },
};
