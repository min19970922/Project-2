/**
 * statsEngine.js - 核心統計引擎 (強化雙因子版)
 */
const StatsEngine = {
  analyze(logicalGroups, specTarget, isPairedMode, rawActiveGroups) {
    const groupNames = Object.keys(logicalGroups);
    if (groupNames.length === 0) return null;

    // 判斷是否符合雙因子格式 (名稱中包含底線且組數足夠)
    const isTwoWay = this.checkIsTwoWay(rawActiveGroups) && !isPairedMode;

    if (isTwoWay) {
      // --- 執行雙因子 ANOVA ---
      const factorData = rawActiveGroups.map((g) => {
        const parts = g.name.split("_");
        return {
          f1: parts[0],
          f2: parts[1],
          values: g.values.filter((v) => v != null && !isNaN(v)),
        };
      });
      const nameA = rawActiveGroups[0].name.split("_")[0] || "因子 A";
      const nameB = rawActiveGroups[0].name.split("_")[1] || "因子 B";

      const res = twoWayAnova(factorData); // 呼叫 mathUtils.js
      return { type: "TWO_WAY", data: res, nameA, nameB, factorData };
    }

    // --- 以下維持原有的單因子/T檢定邏輯 ---
    let analysis = calculateAdvancedStats(
      logicalGroups,
      specTarget,
      isPairedMode
    );
    if (analysis.type === "ANOVA") {
      const groupsArray = groupNames.map((n) => logicalGroups[n]);
      const levA = leveneTest(groupsArray);
      const useWelch = !levA.isHomogeneous;
      const resA = useWelch ? welchAnova(groupsArray) : analysis.data;

      analysis.isWelch = useWelch;
      analysis.p = resA.p;
      analysis.data = resA;
      analysis.displayMethod = useWelch ? "Welch's ANOVA" : "One-way ANOVA";
      analysis.postHocTitle = useWelch
        ? "🔍 事後檢定 (Games–Howell)"
        : "🔍 事後檢定 (Tukey HSD)";

      if (resA.p < 0.05) {
        if (useWelch) {
          analysis.postHoc = runPostHocGamesHowell(groupsArray, groupNames);
        } else {
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
      analysis.displayMethod = analysis.type.replace("_", " ");
      analysis.p = analysis.data.p;
    }
    return analysis;
  },

  checkIsTwoWay(rawActiveGroups) {
    return (
      rawActiveGroups.length >= 2 &&
      rawActiveGroups.every((g) => g.name.includes("_"))
    );
  },
};
