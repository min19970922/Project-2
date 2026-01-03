let columnsData = [];
let lastClickedPoint = null;

let lastFocusedCell = { col: null, row: null, type: null };

function initTable() {
  columnsData = [];
  columnsData.push({
    name: "序號",
    color: "transparent",
    values: [],
    isSequence: true,
  });
  addNewColumn(true);
  addNewColumn(true);

  ensureSequenceValues();

  renderTable();
}

function ensureSequenceValues() {
  let maxRows = 0;
  columnsData.forEach((col) => {
    if (!col.isSequence && col.values.length > maxRows)
      maxRows = col.values.length;
  });

  const seqCol = columnsData.find((c) => c.isSequence);
  if (seqCol) {
    for (let i = 0; i < maxRows; i++) {
      if (seqCol.values[i] === undefined || seqCol.values[i] === null) {
        seqCol.values[i] = i + 1;
      }
    }
  }
}
function toggleTableEditor() {
  const section = document.getElementById("tableEditorSection");
  if (section.style.display === "none" || section.style.display === "") {
    section.style.display = "block";
    renderTable();
  } else {
    section.style.display = "none";
  }
}

function renderTable() {
  const container = document.getElementById("tableContainer");
  let maxRows = 0;
  columnsData.forEach((col) => {
    if (col.values.length > maxRows) maxRows = col.values.length;
  });
  const displayRows = maxRows + 1;

  let html = '<table class="data-table">';

  html += "<thead><tr>";
  if (columnsData.length === 0) {
    html +=
      '<td style="padding:20px; color:#999; font-style:italic;" colspan="1">暫無數據</td>';
  } else {
    columnsData.forEach((col, idx) => {
      if (col.isSequence) {
        html += `
    <th class="seq-col-header" style="width: 60px; padding: 5px;">
        <button onclick="autoGroupColoring()" title="依 \\ 自動分組配色" 
            style="padding: 2px 5px; margin: 0; font-size: 12px; background: #27ae60; width: 100%;">
            🎨 配色
        </button>
    </th>`;
      } else {
        html += `
                            <th>
                                <div class="controls-row">
                                    <button class="ctrl-btn" onclick="moveColumn(${idx}, -1)" tabindex="-1"><span class="material-icons" style="font-size:16px;">arrow_back</span></button>
                                    <button class="ctrl-btn" onclick="moveColumn(${idx}, 1)" tabindex="-1"><span class="material-icons" style="font-size:16px;">arrow_forward</span></button>
                                    <input type="color" class="color-picker-mini" value="${col.color}" onchange="updateColumnColor(${idx}, this.value)" tabindex="-1">
                                    <button class="ctrl-btn del" onclick="deleteColumn(${idx})" tabindex="-1"><span class="material-icons" style="font-size:16px;">close</span></button>
                                </div>
                            </th>
                        `;
      }
    });
  }
  html += "</tr>";

  if (columnsData.length > 0) {
    html += "<tr>";
    columnsData.forEach((col, idx) => {
      const extraClass = col.isSequence ? "seq-header" : "";
      html += `
                        <td class="${col.isSequence ? "seq-col-header" : ""}">
                            <input type="text" class="group-header-input ${extraClass}" value="${
        col.name
      }" 
                                data-col="${idx}" data-type="header"
                                onchange="updateColumnName(${idx}, this.value)" placeholder="標題">
                        </td>
                    `;
    });
    html += "</tr>";
  }
  html += "</thead>";

  html += "<tbody>";
  if (columnsData.length > 0) {
    for (let r = 0; r < displayRows; r++) {
      html += "<tr>";
      columnsData.forEach((col, cIdx) => {
        // --- 替換後的程式碼 ---
        // 1. 修改數值判斷：如果是序號欄，不檢查 isNaN，允許顯示文字
        let val =
          col.values[r] !== undefined && col.values[r] !== null
            ? col.values[r]
            : "";

        if (col.isSequence && val === "") {
          val = r + 1;
        }

        const cellStyle = col.isSequence
          ? "background-color:#f9f9f9; color:#666;"
          : "";

        // 2. 動態判斷輸入類型：序號欄用 text，數據欄用 number
        const inputType = col.isSequence ? "text" : "number";
        const stepAttr = col.isSequence ? "" : 'step="any"';

        html += `
    <td style="${cellStyle}">
        <input type="${inputType}" ${stepAttr} class="cell-input" value="${val}"
            data-col="${cIdx}" data-row="${r}" data-type="data"
            onchange="updateCellValue(${cIdx}, ${r}, this.value)">
    </td>
`;
      });
      html += "</tr>";
    }
  }
  html += "</tbody></table>";

  container.innerHTML = html;

  if (lastFocusedCell.type) {
    let selector = "";
    if (lastFocusedCell.type === "header") {
      selector = `input[data-col="${lastFocusedCell.col}"][data-type="header"]`;
    } else {
      selector = `input[data-col="${lastFocusedCell.col}"][data-row="${lastFocusedCell.row}"][data-type="data"]`;
    }
    const el = container.querySelector(selector);
    if (el) {
      el.focus();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tableSection = document.getElementById("tableEditorSection");

  tableSection.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target.tagName !== "INPUT") return;

    const col = parseInt(target.getAttribute("data-col"));
    const row = parseInt(target.getAttribute("data-row"));
    const type = target.getAttribute("data-type");

    if (!isNaN(col)) {
      lastFocusedCell = { col, row, type };
    }

    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Enter"
    ) {
      if (type === "header") {
        if (e.key === "ArrowDown" || e.key === "Enter")
          focusCell(col, 0, "data");
        else if (e.key === "ArrowRight") focusCell(col + 1, null, "header");
        else if (e.key === "ArrowLeft") focusCell(col - 1, null, "header");
        e.preventDefault();
      } else if (type === "data") {
        if (e.key === "ArrowUp") {
          focusCell(col, row - 1, "data");
          e.preventDefault();
        } else if (e.key === "ArrowDown" || e.key === "Enter") {
          focusCell(col, row + 1, "data");
          e.preventDefault();
        } else if (
          e.key === "ArrowLeft" &&
          (target.value === "" || e.ctrlKey)
        ) {
          focusCell(col - 1, row, "data");
          e.preventDefault();
        } else if (
          e.key === "ArrowRight" &&
          (target.value === "" || e.ctrlKey)
        ) {
          focusCell(col + 1, row, "data");
          e.preventDefault();
        }
      }
    }
  });

  tableSection.addEventListener("paste", (e) => {
    const active = document.activeElement;
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData("Text");
    if (!pastedData) return;
    if (
      !pastedData.includes("\n") &&
      !pastedData.includes("\r") &&
      !pastedData.includes("\t")
    ) {
      return;
    }

    if (
      !active ||
      active.tagName !== "INPUT" ||
      !active.hasAttribute("data-col")
    ) {
      e.preventDefault();
      handleBulkPaste(pastedData);
      return;
    }
    const startCol = parseInt(active.getAttribute("data-col"));
    const startRow =
      active.getAttribute("data-type") === "data"
        ? parseInt(active.getAttribute("data-row"))
        : 0;
    const isHeader = active.getAttribute("data-type") === "header";

    if (isNaN(startCol)) return;
    e.preventDefault();
    handleMatrixPaste(pastedData, startCol, startRow, isHeader);
  });
});

function focusCell(c, r, type) {
  const container = document.getElementById("tableContainer");
  let selector = "";
  if (type === "header") {
    selector = `input[data-col="${c}"][data-type="header"]`;
  } else {
    if (r < 0) {
      focusCell(c, 0, "header");
      return;
    }
    selector = `input[data-col="${c}"][data-row="${r}"][data-type="data"]`;
  }
  const el = container.querySelector(selector);
  if (el) {
    el.focus();
    lastFocusedCell = { col: c, row: r, type: type };
  }
}

function handleMatrixPaste(text, startCol, startRow, startedInHeader) {
  const rows = text.trim().split(/\r\n|\n|\r/);
  if (rows.length === 0) return;

  const firstLine = rows[0];
  const separator = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(",")
    ? ","
    : null;

  rows.forEach((rowStr, rIdx) => {
    if (!rowStr.trim()) return;
    const cells = rowStr.split(separator || /\s+/);

    cells.forEach((cellData, cIdx) => {
      const targetColIdx = startCol + cIdx;

      while (columnsData.length <= targetColIdx) {
        addNewColumn(true);
      }

      if (startedInHeader) {
        if (rIdx === 0) {
          columnsData[targetColIdx].name = cellData.trim();
        } else {
          const dataRowIdx = rIdx - 1;
          setVal(targetColIdx, dataRowIdx, cellData);
        }
      } else {
        const dataRowIdx = startRow + rIdx;
        setVal(targetColIdx, dataRowIdx, cellData);
      }
    });
  });

  ensureSequenceValues();
  renderTable();
  go();
}

function setVal(colIdx, rowIdx, valStr) {
  if (valStr.trim() === "") return;

  while (columnsData[colIdx].values.length <= rowIdx) {
    columnsData[colIdx].values.push(null);
  }

  if (columnsData[colIdx].isSequence) {
    // 序號欄直接存文字
    columnsData[colIdx].values[rowIdx] = valStr.trim();
  } else {
    // 數據欄才轉數字
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      columnsData[colIdx].values[rowIdx] = parsed;
    }
  }
}

function addNewColumn(silent = false) {
  const dataCols = columnsData.filter((c) => !c.isSequence);

  columnsData.push({
    name: `組別 ${dataCols.length + 1}`,
    color: "#000000",
    values: [],
  });
  if (!silent) {
    ensureSequenceValues();
    renderTable();
  }
}

function deleteColumn(index) {
  if (columnsData[index].isSequence) return;
  columnsData.splice(index, 1);
  ensureSequenceValues();
  renderTable();
  go();
}

function moveColumn(index, direction) {
  const minIndex = columnsData[0].isSequence ? 1 : 0;

  if (direction === -1 && index > minIndex) {
    [columnsData[index], columnsData[index - 1]] = [
      columnsData[index - 1],
      columnsData[index],
    ];
    if (lastFocusedCell.col === index) lastFocusedCell.col = index - 1;
    else if (lastFocusedCell.col === index - 1) lastFocusedCell.col = index;

    renderTable();
    go();
  } else if (direction === 1 && index < columnsData.length - 1) {
    [columnsData[index], columnsData[index + 1]] = [
      columnsData[index + 1],
      columnsData[index],
    ];
    if (lastFocusedCell.col === index) lastFocusedCell.col = index + 1;
    else if (lastFocusedCell.col === index + 1) lastFocusedCell.col = index;

    renderTable();
    go();
  }
}

function updateColumnColor(index, color) {
  columnsData[index].color = color;
  go();
}

function updateColumnName(index, name) {
  columnsData[index].name = name;
  go();
}

function updateCellValue(colIndex, rowIndex, value) {
  while (columnsData[colIndex].values.length <= rowIndex) {
    columnsData[colIndex].values.push(null);
  }

  // 修改：如果是序號欄則存字串，否則才轉數字
  if (columnsData[colIndex].isSequence) {
    columnsData[colIndex].values[rowIndex] = value;
  } else {
    columnsData[colIndex].values[rowIndex] =
      value === "" ? null : parseFloat(value);
  }

  ensureSequenceValues();
  renderTable();
  go(); // 確保改完立即更新圖表
}
function handleBulkPaste(text) {
  const rows = text.trim().split(/\r\n|\n|\r/);
  if (rows.length === 0) return;

  const firstLine = rows[0];
  const separator = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(",")
    ? ","
    : null;

  const headerRow = firstLine.split(separator || /\s+/).map((h) => h.trim());
  const valueRows = rows.slice(1);
  const newCols = [];

  headerRow.forEach((h, idx) => {
    const colValues = [];
    valueRows.forEach((r) => {
      if (!r.trim()) return;
      const cells = r.split(separator || /\s+/);
      if (cells[idx] !== undefined) {
        const v = cells[idx].trim();
        if (v !== "") {
          const parsed = parseFloat(v);
          if (!isNaN(parsed)) colValues.push(parsed);
        }
      }
    });

    const existingDataCols = columnsData.filter((c) => !c.isSequence).length;
    newCols.push({
      name: h.trim() || `組別 ${existingDataCols + newCols.length + 1}`,
      color: "#000000",
      values: colValues,
    });
  });

  columnsData = columnsData.concat(newCols);

  ensureSequenceValues();
  renderTable();
  go();
}

/**
 * 一鍵自動分組配色邏輯
 * 依據「分組\\項目」中的分組名稱自動分配顏色
 */
function autoGroupColoring() {
  const groupMap = {};
  // 豐富的配色色票
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
  ];

  // 隨機打亂顏色順序 (Fisher-Yates Shuffle)
  for (let i = baseColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baseColors[i], baseColors[j]] = [baseColors[j], baseColors[i]];
  }

  let colorIdx = 0;
  // 遍歷所有數據欄位 (排除序號欄)
  columnsData.forEach((col) => {
    if (col.isSequence) return;

    // 取得「\\」前面的文字作為分組依據
    const prefix = col.name.split("\\")[0].trim();

    if (!groupMap[prefix]) {
      groupMap[prefix] = baseColors[colorIdx % baseColors.length];
      colorIdx++;
    }

    // 指定顏色
    col.color = groupMap[prefix];
  });

  // 更新介面與圖表
  renderTable();
  if (typeof go === "function") {
    go(); // 重新生成圖表以反映顏色變動
  }
}
