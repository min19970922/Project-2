/**
 * reportRenderer.js - 負責最後的文字總結報告
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

/**
 * 渲染雙因子 ANOVA 報告表格 (28px 大字體版)
 */
function renderTwoWayTable(res, nameA, nameB) {
  const resultDiv = document.getElementById("statisticsResult");
  if (!resultDiv || !res) return;

  const formatVal = (v) => (v === undefined || isNaN(v) ? "---" : v.toFixed(4));
  const formatP = (p) =>
    p < 0.05
      ? `<b style="color:#c0392b;">${
          p < 0.0001 ? "< 0.0001" : p.toFixed(5)
        }</b>`
      : p.toFixed(5);

  const getFlag = (p) =>
    p < 0.05
      ? `<span style="color:#c0392b; font-weight:bold;">🚩 顯著</span>`
      : `<span style="color:#7f8c8d;">不顯著</span>`;

  // 計算 MS (Mean Square) 若數據中未包含
  const msA = res.factorA.f * res.error.ms;
  const msB = res.factorB.f * res.error.ms;
  const msAB = res.interaction.f * res.error.ms;

  let html = `
    <div style="margin: 40px auto; max-width: 95%; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #e0e0e0; font-family: 'Calibri', sans-serif; font-size: 28px;">
      <h2 style="color: #1f4e78; border-bottom: 4px solid #1f4e78; padding-bottom: 15px; margin-bottom: 20px; font-size: 32px;">
        📊 雙因子變異數分析報告 <span style="font-size: 24px; font-weight: normal; color: #555;">(Two-way ANOVA)</span>
      </h2>
      <table style="width:100%; border-collapse: collapse; margin-top:20px; font-size:24px;">
        <thead>
          <tr style="background:#f8f9fa; border-top:1px solid #dee2e6; border-bottom:1px solid #dee2e6;">
            <th style="padding:12px; text-align:left;">變異來源</th>
            <th style="padding:12px; text-align:center;">df</th>
            <th style="padding:12px; text-align:center;">MS</th>
            <th style="padding:12px; text-align:center;">F</th>
            <th style="padding:12px; text-align:center;">P-value</th>
            <th style="padding:12px; text-align:center;">判定</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;">${nameA} (因子 A)</td>
            <td style="padding:12px; text-align:center;">${res.factorA.df}</td>
            <td style="padding:12px; text-align:center;">${formatVal(msA)}</td>
            <td style="padding:12px; text-align:center;">${formatVal(
              res.factorA.f
            )}</td>
            <td style="padding:12px; text-align:center;">${formatP(
              res.factorA.p
            )}</td>
            <td style="padding:12px; text-align:center;">${getFlag(
              res.factorA.p
            )}</td>
          </tr>
          <tr>
            <td style="padding:12px;">${nameB} (因子 B)</td>
            <td style="padding:12px; text-align:center;">${res.factorB.df}</td>
            <td style="padding:12px; text-align:center;">${formatVal(msB)}</td>
            <td style="padding:12px; text-align:center;">${formatVal(
              res.factorB.f
            )}</td>
            <td style="padding:12px; text-align:center;">${formatP(
              res.factorB.p
            )}</td>
            <td style="padding:12px; text-align:center;">${getFlag(
              res.factorB.p
            )}</td>
          </tr>
          <tr style="background:#fffcf5;">
            <td style="padding:12px;">交互作用 (Interaction)</td>
            <td style="padding:12px; text-align:center;">${
              res.interaction.df
            }</td>
            <td style="padding:12px; text-align:center;">${formatVal(msAB)}</td>
            <td style="padding:12px; text-align:center;">${formatVal(
              res.interaction.f
            )}</td>
            <td style="padding:12px; text-align:center;">${formatP(
              res.interaction.p
            )}</td>
            <td style="padding:12px; text-align:center;">${getFlag(
              res.interaction.p
            )}</td>
          </tr>
          <tr style="background:#fafafa; color:#7f8c8d;">
            <td style="padding:12px;">誤差 (Error)</td>
            <td style="padding:12px; text-align:center;">${res.error.df}</td>
            <td style="padding:12px; text-align:center;">${formatVal(
              res.error.ms
            )}</td>
            <td colspan="3" style="text-align:center;">---</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  resultDiv.innerHTML = html;
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
