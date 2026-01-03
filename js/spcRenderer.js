/**
 * spcRenderer.js - 負責製程能力報告 (SPC)
 */
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
