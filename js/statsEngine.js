/**
 * statsEngine.js
 * 核心統計引擎：負責執行檢定邏輯、判定變異數齊性、並自動選擇事後檢定方法。
 */

const StatsEngine = {
  /**
   * 執行完整統計分析流程
   * @param {Object} logicalGroups - 整理後的組別數據 { "組A": [1,2,3], "組B": [4,5,6] }
   * @param {number} specTarget - 規格中心值 (用於單一樣本 T 檢定)
   * @param {boolean} isPairedMode - 是否執行成對檢定
   * @returns {Object} 包含統計數據與判定結果的物件
   */
  analyze(logicalGroups, specTarget, isPairedMode) {
    const groupNames = Object.keys(logicalGroups);
    if (groupNames.length === 0) return null;

    // 1. 執行基礎統計計算 (呼叫 mathUtils.js 的原始邏輯)
    // 此處包含 One-sample T, Independent T, Paired T 或初步 ANOVA
    let analysis = calculateAdvancedStats(
      logicalGroups,
      specTarget,
      isPairedMode
    );

    // 2. 針對多組比較 (ANOVA) 進行深度優化
    if (analysis.type === "ANOVA") {
      const groupsArray = groupNames.map((n) => logicalGroups[n]);

      // 執行 Levene Test 判定變異數齊性
      const levA = leveneTest(groupsArray);
      const useWelch = !levA.isHomogeneous;

      // 根據判定結果，選擇 Welch's ANOVA 或傳統 One-way ANOVA
      const resA = useWelch ? welchAnova(groupsArray) : analysis.data;

      // 統一寫入分析結果物件，方便後續顯示
      analysis.isWelch = useWelch;
      analysis.leveneP = levA.p;
      analysis.p = resA.p;
      analysis.data = resA; // 更新為最終選用的 ANOVA 數據
      analysis.displayMethod = useWelch ? "Welch's ANOVA" : "One-way ANOVA";
      analysis.postHocTitle = useWelch
        ? "🔍 事後檢定 (Games–Howell)"
        : "🔍 事後檢定 (Tukey HSD)";

      // 3. 如果 ANOVA 顯著 (P < 0.05)，自動執行對應的事後檢定
      if (resA.p < 0.05) {
        if (useWelch) {
          // 變異數不齊一 -> 執行 Games-Howell
          analysis.postHoc = runPostHocGamesHowell(groupsArray, groupNames);
        } else {
          // 變異數齊一 -> 執行 Tukey HSD
          // 計算均方誤差 (MSW = SSW / df2)
          const msw = resA.ssw / resA.df2;
          analysis.postHoc = runPostHocTukey(
            groupsArray,
            groupNames,
            msw,
            resA.df2
          );
        }
      }
    } else if (analysis.type.includes("T")) {
      // T 檢定部分的顯示名稱優化
      analysis.displayMethod = analysis.type.replace("_", " ");
      analysis.p = analysis.data.p;
    }

    return analysis;
  },

  /**
   * 輔助功能：判斷是否為雙因子數據
   * @param {Array} rawActiveGroups 原始啟用的欄位數據
   */
  checkIsTwoWay(rawActiveGroups) {
    return (
      rawActiveGroups.length >= 2 &&
      rawActiveGroups.every((g) => g.name.includes("_"))
    );
  },
};
