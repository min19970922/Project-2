const SETTINGS_KEYS = [
  "mainTitle",
  "titleFontSize",
  "yUnitLeft",
  "fontSize",
  "lineWidth",
  "pointSize",
  "chartHeight",
  "specLSL",
  "specTarget",
  "specUSL",
  "specLineStyle",
  "specLineColor",
  "yMinLeft",
  "yMaxLeft",
  "yStepLeft",
  "showBox",
  "showDot",
  "showOutliers",
  "showAllPoints",
  "showMean",
  "showMedian",
  "showExtremes",
  "showWhiskers",
  "showGrid",
  "useBoldFont",
  "boxGap",
  "extremeXOffsetInput",
  "meanMedianXOffsetInput",
  "statFontSize",
  "showCapability",
  "subgroupMode",
  "subgroupSizeInput",
  "stdDevMethod",
  "combineGroups",
  "yUnitRight",
  "modeBox",
  "modeLine",
  "modeBar",
  "modeMixed",
  "showPValue",
  "showPairedP",
];

function saveSettings() {
  const settings = {};
  SETTINGS_KEYS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // 根據類型存值：checkbox 存 checked，其他存 value
    settings[id] = el.type === "checkbox" ? el.checked : el.value;
  });

  localStorage.setItem("chart_34_4_settings", JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem("chart_34_4_settings");
  if (!saved) {
    return;
  }

  const settings = JSON.parse(saved);
  SETTINGS_KEYS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && settings[id] !== undefined) {
      if (el.type === "checkbox") {
        el.checked = settings[id];
      } else {
        el.value = settings[id];
      }
    }
  });
}
