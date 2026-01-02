// js/mathUtils.js
function normalPDF(x, mean, std) {
  return (
    (1 / (std * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
  );
}

function normalCDF(x) {
  var t = 1 / (1 + 0.2316419 * Math.abs(x));
  var d = 0.3989423 * Math.exp((-x * x) / 2);
  var prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function invNormalCDF(p) {
  if (p >= 1) return Infinity;
  if (p <= 0) return -Infinity;
  var a1 = -39.6968302866538,
    a2 = 220.946098424521,
    a3 = -275.928510446969,
    a4 = 138.357751867269,
    a5 = -30.6647980661472,
    a6 = 2.50662827745924;
  var b1 = -54.4760987982241,
    b2 = 161.585836858041,
    b3 = -155.698979859887,
    b4 = 66.8013118877197,
    b5 = -13.2806815528857,
    c1 = -7.78489400243029e-3;
  var c2 = -3.22396458041136e-1,
    c3 = -2.40075827716184,
    c4 = -2.54973253934373,
    c5 = 4.37466414146497,
    c6 = 2.93816398269878,
    d1 = 7.78469570904146e-3;
  var d2 = 3.22467129070039e-1,
    d3 = 2.44513413714299,
    d4 = 3.75440866190742;
  var p_low = 0.02425,
    p_high = 1 - p_low,
    q,
    r;
  if (0 < p && p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  } else if (p_low <= p && p <= p_high) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
}

const CONSTANTS = {
  c4: [
    0, 0, 0.7979, 0.8862, 0.9213, 0.94, 0.9515, 0.9594, 0.965, 0.9693, 0.9727,
    0.9754, 0.9776, 0.9794, 0.981, 0.9823, 0.9835, 0.9845, 0.9854, 0.9862,
    0.9869, 0.9876, 0.9882, 0.9887, 0.9892, 0.9896,
  ],
  d2: [
    0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.97, 3.078, 3.173,
    3.258, 3.336, 3.407, 3.472, 3.532, 3.588, 3.64, 3.689, 3.735, 3.778, 3.819,
    3.858, 3.895, 3.931,
  ],
};

const STAT_TABLES = {
  // 擴充 Tukey HSD 臨界值表 (Alpha = 0.05)，支援 k=2~20
  TUKEY_Q_05: {
    5: [
      3.64, 4.6, 5.22, 5.67, 6.03, 6.33, 6.58, 6.8, 6.99, 7.17, 7.32, 7.47, 7.6,
      7.72, 7.83, 7.93, 8.03, 8.12, 8.21,
    ],
    10: [
      3.15, 3.88, 4.33, 4.65, 4.91, 5.12, 5.3, 5.46, 5.6, 5.72, 5.83, 5.93,
      6.03, 6.11, 6.19, 6.27, 6.34, 6.4, 6.47,
    ],
    20: [
      2.95, 3.58, 3.96, 4.23, 4.45, 4.62, 4.77, 4.9, 5.01, 5.11, 5.2, 5.28,
      5.36, 5.43, 5.49, 5.55, 5.61, 5.67, 5.72,
    ],
    40: [
      2.86, 3.44, 3.79, 4.04, 4.23, 4.39, 4.52, 4.63, 4.74, 4.82, 4.91, 4.98,
      5.05, 5.11, 5.17, 5.22, 5.27, 5.32, 5.36,
    ],
    60: [
      2.83, 3.4, 3.74, 3.98, 4.16, 4.31, 4.44, 4.55, 4.65, 4.73, 4.81, 4.88,
      4.94, 5.0, 5.06, 5.11, 5.15, 5.2, 5.24,
    ],
    120: [
      2.8, 3.36, 3.68, 3.92, 4.1, 4.24, 4.36, 4.47, 4.56, 4.64, 4.71, 4.78,
      4.84, 4.9, 4.95, 5.0, 5.04, 5.09, 5.13,
    ],
    999: [
      2.77, 3.31, 3.63, 3.86, 4.03, 4.17, 4.29, 4.39, 4.47, 4.55, 4.62, 4.68,
      4.74, 4.8, 4.85, 4.89, 4.94, 4.98, 5.02,
    ],
  },
};

function getC4(n) {
  return n <= 1 ? 1 : n < 26 ? CONSTANTS.c4[n] : (4 * (n - 1)) / (4 * n - 3);
}
function getD2(n) {
  if (n <= 1) return 1;
  if (n < CONSTANTS.d2.length) return CONSTANTS.d2[n];
  // 針對大樣本的專業近似公式
  return 3.267 * Math.pow(n, -0.031);
}

function getTukeyQ(k, df) {
  const table = STAT_TABLES.TUKEY_Q_05;
  // 更新 k 的限制範圍至 20
  const kIdx = Math.min(Math.max(k, 2), 20) - 2;
  const dfs = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  let targetDF = dfs.find((d) => d >= df) || 999;
  return table[targetDF][kIdx];
}

function logGamma(z) {
  const coeff = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let x = z,
    y = z,
    tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j <= 5; j++) ser += coeff[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betainc(x, a, b) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );
  const betacf = (x, a, b) => {
    const MAXIT = 100,
      EPS = 3e-7,
      FPMIN = 1e-30;
    let qab = a + b,
      qap = a + 1,
      qam = a - 1,
      c = 1,
      d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      let m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      let del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  };
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

function tCDF(t, df) {
  const x = df / (df + t * t);
  const p = betainc(x, df / 2, 0.5);
  return t > 0 ? 1 - 0.5 * p : 0.5 * p;
}

function fCDF(F, df1, df2) {
  if (F <= 0 || isNaN(F)) return 0;
  const x = df2 / (df2 + df1 * F);
  return 1 - betainc(x, df2 / 2, df1 / 2);
}

const getMean = (arr) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
const getVar = (arr, mean) =>
  arr.length < 2
    ? 0
    : arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);

function oneSampleTTest(data, mu) {
  const n = data.length;
  const mean = getMean(data);
  const s2 = getVar(data, mean);
  const t = (mean - mu) / Math.sqrt(s2 / n);
  const df = n - 1;
  const p = 2 * Math.min(tCDF(t, df), 1 - tCDF(t, df));
  return { t, df, p, mean, n };
}

function independentTTest(data1, data2, equalVar = false) {
  const n1 = data1.length,
    n2 = data2.length;
  const m1 = getMean(data1),
    m2 = getMean(data2);
  const v1 = getVar(data1, m1),
    v2 = getVar(data2, m2);

  let t, df;
  if (equalVar) {
    // 1. 標準合併 T 檢定 (Student's T-test - Pooled Variance)
    const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    t = (m1 - m2) / Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  } else {
    // 2. Welch's T-test (Unequal Variances)
    t = (m1 - m2) / Math.sqrt(v1 / n1 + v2 / n2);
    df =
      Math.pow(v1 / n1 + v2 / n2, 2) /
      (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  }
  const p = 2 * Math.min(tCDF(t, df), 1 - tCDF(t, df));
  return {
    t,
    df,
    p,
    m1,
    m2,
    method: equalVar
      ? "Student's T-test (Equal Var)"
      : "Welch's T-test (Unequal Var)",
  };
}

function pairedTTest(data1, data2) {
  if (data1.length !== data2.length || data1.length < 2)
    return { error: "數據長度不一致或樣本過少" };
  const diffs = data1.map((v, i) => v - data2[i]);
  return oneSampleTTest(diffs, 0);
}

function oneWayAnova(groups) {
  const k = groups.length;
  const groupMeans = groups.map((g) => getMean(g));
  const groupSizes = groups.map((g) => g.length);
  const N = groupSizes.reduce((a, b) => a + b, 0);
  const grandMean = groups.flat().reduce((a, b) => a + b, 0) / N;

  const ssb = groupSizes.reduce(
    (acc, n, i) => acc + n * Math.pow(groupMeans[i] - grandMean, 2),
    0
  );
  // 修正 SSw 計算公式：初始值應為 0
  const ssw = groups.reduce(
    (acc, g, i) =>
      acc + g.reduce((sum, val) => sum + Math.pow(val - groupMeans[i], 2), 0),
    0
  );

  const df1 = k - 1;
  const df2 = N - k;
  const msb = ssb / df1;
  const msw = ssw / df2;
  const F = msb / msw;
  const p = 1 - fCDF(F, df1, df2);
  return { F, df1, df2, p, ssb, ssw };
}

function runPostHocTukey(groups, groupNames, msw, df2) {
  let results = [];
  const k = groups.length;
  const means = groups.map((g) => getMean(g));
  const ns = groups.map((g) => g.length);
  const qCrit = getTukeyQ(k, df2);

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = Math.abs(means[i] - means[j]);

      // ✨ 修正點：使用 Tukey-Kramer 修正公式，這對各組人數不等時更準確（同 Minitab）
      const se = Math.sqrt((msw / 2) * (1 / ns[i] + 1 / ns[j]));
      const qValue = diff / se;

      results.push({
        pair: `${groupNames[i]} vs ${groupNames[j]}`,
        diff: diff.toFixed(4),
        qValue: qValue.toFixed(4),
        qCrit: qCrit.toFixed(3), // 顯示臨界值供對照
        isSignificant: qValue >= qCrit, // 使用大於等於
      });
    }
  }
  return results;
}

/**
 * 執行 Games–Howell 事後檢定 (適用於變異數不齊一)
 */
function runPostHocGamesHowell(groups, groupNames) {
  let results = [];
  const k = groups.length;
  const means = groups.map((g) => getMean(g));
  const vars = groups.map((g, i) => getVar(g, means[i]));
  const ns = groups.map((g) => g.length);

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = Math.abs(means[i] - means[j]);
      // 計算 Games-Howell 標準誤差
      const se = Math.sqrt(vars[i] / ns[i] + vars[j] / ns[j]);
      const tValue = diff / se;

      // 計算修正後的自由度 (Welch-Satterthwaite)
      const df =
        Math.pow(vars[i] / ns[i] + vars[j] / ns[j], 2) /
        (Math.pow(vars[i] / ns[i], 2) / (ns[i] - 1) +
          Math.pow(vars[j] / ns[j], 2) / (ns[j] - 1));

      // 取得對應的 Q 臨界值 (Games-Howell 通常也參考 Tukey Q 分佈)
      const qCrit = getTukeyQ(k, df);
      const qValue = tValue * Math.sqrt(2); // 轉換為 Q 統計量

      results.push({
        pair: `${groupNames[i]} vs ${groupNames[j]}`,
        diff: diff.toFixed(4),
        qValue: qValue.toFixed(4),
        qCrit: qCrit.toFixed(3),
        isSignificant: qValue >= qCrit,
        method: "Games-Howell",
      });
    }
  }
  return results;
}
/**
 * 執行 Levene's Test (變異數同質性檢定 - Brown-Forsythe 修正版)
 */
function leveneTest(groups) {
  const k = groups.length; // 組數
  const ns = groups.map((g) => g.length); // 各組樣本數
  const N = ns.reduce((a, b) => a + b, 0); // 總樣本數

  // 1. 計算各組中位數，並求出絕對偏差值 (Absolute Deviations)
  const deviations = groups.map((g) => {
    const sorted = [...g].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    // 計算中位數
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    // 回傳每個點與中位數的距離
    return g.map((val) => Math.abs(val - median));
  });

  // 2. 對偏差值執行單因子變異數分析 (利用你原本寫好的 oneWayAnova)
  const res = oneWayAnova(deviations);

  return {
    F: res.F,
    p: res.p,
    df1: k - 1,
    df2: N - k,
    isHomogeneous: res.p >= 0.05, // P >= 0.05 代表變異數齊一，符合統計假設
  };
}

function calculateAdvancedStats(logicalGroups, targetValue, isPairedMode) {
  const groupNames = Object.keys(logicalGroups);
  const result = { type: null, data: null, postHoc: null, names: groupNames };

  if (groupNames.length === 1 && !isNaN(targetValue)) {
    result.type = "ONE_SAMPLE_T";
    result.data = oneSampleTTest(logicalGroups[groupNames[0]], targetValue);
  } else if (groupNames.length === 2) {
    const d1 = logicalGroups[groupNames[0]],
      d2 = logicalGroups[groupNames[1]];
    result.type = isPairedMode ? "PAIRED_T" : "INDEPENDENT_T";
    result.data = isPairedMode ? pairedTTest(d1, d2) : independentTTest(d1, d2);
  } else if (groupNames.length >= 3) {
    const groupsArray = groupNames.map((n) => logicalGroups[n]);
    const levA = leveneTest(groupsArray);
    const anova = levA.isHomogeneous
      ? oneWayAnova(groupsArray)
      : welchAnova(groupsArray);
    result.type = "ANOVA";
    result.data = anova;
    if (anova.p < 0.05) {
      result.postHoc = runPostHocTukey(
        groupsArray,
        groupNames,
        anova.ssw / anova.df2,
        anova.df2
      );
    }
  }
  return result;
}

function getAdvancedStatsResult(logicalGroups, targetValue, isPairedMode) {
  const groupNames = Object.keys(logicalGroups);
  const result = {
    type: null,
    groupNames: groupNames,
    data: null,
    postHoc: null,
    target: targetValue,
  };

  if (groupNames.length === 1) {
    // A. 單一樣本 T 檢定
    if (!isNaN(targetValue)) {
      result.type = "One_Sample_T";
      result.data = oneSampleTTest(logicalGroups[groupNames[0]], targetValue);
    }
  } else if (groupNames.length === 2) {
    // B. 兩組比較
    const data1 = logicalGroups[groupNames[0]];
    const data2 = logicalGroups[groupNames[1]];

    if (isPairedMode) {
      result.type = "Paired_T";
      result.data = pairedTTest(data1, data2);
    } else {
      result.type = "Independent_T";
      result.data = independentTTest(data1, data2);
    }
  } else if (groupNames.length >= 3) {
    // C. 多組比較 (ANOVA)
    const groupsArray = groupNames.map((name) => logicalGroups[name]);
    const res = oneWayAnova(groupsArray);
    result.type = "ANOVA";
    result.data = anova;

    // 如果顯著，執行事後檢定
    if (res.p < 0.05) {
      result.postHoc = runPostHocTukey(
        groupsArray,
        groupNames,
        res.ssw / res.df2,
        res.df2
      );
    }
  }

  return result;
}

function welchAnova(groups) {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const means = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);

  // 邊界檢查：計算變異數，若為 0 則給予極小值以維持數值穩定
  const vars = groups.map((g, i) => {
    const v =
      g.reduce((acc, val) => acc + Math.pow(val - means[i], 2), 0) /
      (g.length - 1);
    return v === 0 ? 1e-10 : v;
  });

  const weights = ns.map((n, i) => n / vars[i]);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const grandMean = weights.reduce((acc, w, i) => acc + w * means[i], 0) / sumW;

  const hi = weights.map((w, i) => Math.pow(1 - w / sumW, 2) / (ns[i] - 1));
  const sumHi = hi.reduce((a, b) => a + b, 0);

  const F =
    weights.reduce(
      (acc, w, i) => acc + w * Math.pow(means[i] - grandMean, 2),
      0
    ) /
    (k - 1) /
    (1 + ((2 * (k - 2)) / (k * k - 1)) * sumHi);

  const df1 = k - 1;
  const df2 = (k * k - 1) / (3 * sumHi);
  const p = 1 - jStat.centralF.cdf(F, df1, df2);

  // 模擬 Minitab 紀錄中間值供 Debug 使用
  return { F, p, df1, df2, method: "Welch" };
}

/**
 * 執行雙因子變異數分析 (Two-way ANOVA)
 * 數據格式：[{f1: '高溫', f2: '100psi', values: [...]}, ...]
 */
function twoWayAnova(factorData) {
  const allPoints = factorData.flatMap((d) => d.values);
  const N = allPoints.length;
  const grandMean = getMean(allPoints);

  // 提取因子層次
  const levels1 = [...new Set(factorData.map((d) => d.f1))];
  const levels2 = [...new Set(factorData.map((d) => d.f2))];
  const a = levels1.length;
  const b = levels2.length;

  // 總平方和 SST
  const sst = allPoints.reduce((acc, v) => acc + Math.pow(v - grandMean, 2), 0);

  // 因子 A 平方和 SSA
  let ssa = 0;
  levels1.forEach((l1) => {
    const group = factorData
      .filter((d) => d.f1 === l1)
      .flatMap((d) => d.values);
    if (group.length > 0) {
      ssa += group.length * Math.pow(getMean(group) - grandMean, 2);
    }
  });

  // 因子 B 平方和 SSB
  let ssb = 0;
  levels2.forEach((l2) => {
    const group = factorData
      .filter((d) => d.f2 === l2)
      .flatMap((d) => d.values);
    if (group.length > 0) {
      ssb += group.length * Math.pow(getMean(group) - grandMean, 2);
    }
  });

  // 組內平方和 SSW (Error)
  let ssw = 0;
  factorData.forEach((cell) => {
    const m = getMean(cell.values);
    ssw += cell.values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  });

  // 交互作用平方和 SSAB
  const ssab = sst - ssa - ssb - ssw;

  // 自由度
  const dfA = a - 1;
  const dfB = b - 1;
  const dfAB = dfA * dfB;
  const dfE = N - a * b;

  // 均方與 F 值
  const msA = ssa / dfA;
  const msB = ssb / dfB;
  const msAB = ssab / dfAB;
  const msE = ssw / dfE;

  return {
    factorA: {
      f: msA / msE,
      p: 1 - fCDF(msA / msE, dfA, dfE),
      df: dfA,
      name: "因子 A",
    },
    factorB: {
      f: msB / msE,
      p: 1 - fCDF(msB / msE, dfB, dfE),
      df: dfB,
      name: "因子 B",
    },
    interaction: {
      f: msAB / msE,
      p: 1 - fCDF(msAB / msE, dfAB, dfE),
      df: dfAB,
      name: "交互作用 (A*B)",
    },
    error: { df: dfE, ms: msE },
  };
}
