function getTimestamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    const h = now.getHours().toString().padStart(2, "0");
    const min = now.getMinutes().toString().padStart(2, "0");
    return `${y}${m}${d}_${h}${min}`;
}

function exportExcel() {
    if (columnsData.length === 0) return alert("無數據可匯出");
    const wb = XLSX.utils.book_new();
    const wsData = [];
    const mainTitleValue = document.getElementById("mainTitle").value || "";
    wsData.push(["__CHART_TITLE__", mainTitleValue]);
    wsData.push(columnsData.map((c) => c.name));

    let maxRows = 0;
    columnsData.forEach(
        (c) => (maxRows = Math.max(maxRows, c.values.length))
    );

    for (let r = 0; r < maxRows; r++) {
        wsData.push(
            columnsData.map((c) =>
                c.values[r] != null && !isNaN(c.values[r]) ? c.values[r] : ""
            )
        );
    }

    wsData.push(columnsData.map(() => "__COLOR__"));
    wsData.push(columnsData.map((c) => c.color));

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(
        wb,
        (mainTitleValue || "ChartData") + "_" + getTimestamp() + ".xlsx"
    );
}

function importMultipleExcels(files) {
    if (files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
        });
        if (data.length < 1) return;

        let startRow = 0;

        if (data[0][0] === "__CHART_TITLE__") {
            document.getElementById("mainTitle").value = data[0][1] || "";
            startRow = 1;
        }

        columnsData = [];
        const headers = data[startRow];
        const colorRowIdx = data.findIndex((r) => r && r[0] === "__COLOR__");

        headers.forEach((h, i) => {
            if (h === "__COLOR__") return;
            let vals = [];
            let limit = colorRowIdx > -1 ? colorRowIdx : data.length;
            for (let r = startRow + 1; r < limit; r++) {
                let v = data[r][i];
                if (v != null && v !== "") vals.push(parseFloat(v));
            }
            let colColor =
                colorRowIdx > -1 &&
                    data[colorRowIdx + 1] &&
                    data[colorRowIdx + 1][i]
                    ? data[colorRowIdx + 1][i]
                    : "#000000";

            let isSeq = h === "序號";

            columnsData.push({
                name: h,
                color: colColor,
                values: vals,
                isSequence: isSeq,
            });
        });

        if (!columnsData.some((c) => c.isSequence)) {
            columnsData.unshift({
                name: "序號",
                color: "transparent",
                values: [],
                isSequence: true,
            });
        }

        ensureSequenceValues();
        renderTable();
        go();
    };
    reader.readAsArrayBuffer(files[0]);
}

async function exportImagesToExcel() {
    const title =
        document.getElementById("mainTitle").value || "Exported_Charts";
    const plotlyDivs = document.querySelectorAll(".plotly-graph-div");
    const cpWrappers = document.querySelectorAll(".cp-report-wrapper");
    if (plotlyDivs.length === 0 && cpWrappers.length === 0)
        return alert("無圖表可匯出");

    document.getElementById("loadingOverlay").style.display = "flex";
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Charts");
        sheet.getCell("A1").value = title;
        sheet.getCell("A1").font = { size: 20, bold: true };
        let currentRow = 2;

        for (let i = 0; i < plotlyDivs.length; i++) {
            const url = await Plotly.toImage(plotlyDivs[i], {
                format: "png",
                width: 1000,
                height: 600,
            });
            const id = workbook.addImage({ base64: url, extension: "png" });
            sheet.addImage(id, {
                tl: { col: 0, row: currentRow },
                ext: { width: 1000, height: 600 },
            });
            currentRow += 32;
        }
        for (let i = 0; i < cpWrappers.length; i++) {
            const canvas = await html2canvas(cpWrappers[i], {
                scale: 2,
                backgroundColor: "#f4f4f4",
            });
            const url = canvas.toDataURL("image/png");
            const id = workbook.addImage({ base64: url, extension: "png" });
            sheet.addImage(id, {
                tl: { col: 0, row: currentRow },
                ext: { width: 800, height: 600 },
            });
            currentRow += 32;
        }
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), title + "_" + getTimestamp() + ".xlsx");
    } catch (e) {
        alert("匯出失敗: " + e.message);
    } finally {
        document.getElementById("loadingOverlay").style.display = "none";
    }
}