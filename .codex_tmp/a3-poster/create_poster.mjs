import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\Insun\\Last-break-of-Honeybadger";
const TMP = path.join(ROOT, ".codex_tmp", "a3-poster");
const OUT = path.join(ROOT, "outputs", "poster");
const FINAL_PPTX = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait.pptx");

const W = 1123;
const H = 1587;
const FONT = "Noto Sans KR";

const C = {
  navy: "#102A43",
  navy2: "#243B53",
  ink: "#1F2933",
  muted: "#52606D",
  light: "#D9E2EC",
  paper: "#F7F6F2",
  white: "#FFFFFF",
  orange: "#F28E2B",
  orangeSoft: "#FCE9D5",
  teal: "#2A7F80",
  tealSoft: "#E5F2F1",
  blue: "#4E79A7",
  green: "#59A14F",
  red: "#E15759",
  purple: "#8F6AAE",
  grid: "#D8DEE5",
};

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function readImageBlob(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, position, style = {}, name = undefined) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize: style.fontSize ?? 18,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    autoFit: style.autoFit ?? "shrinkText",
    insets: style.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
    lineSpacing: style.lineSpacing,
  };
  return shape;
}

function addRect(slide, position, fill, name = undefined, line = undefined) {
  return slide.shapes.add({
    geometry: "rect",
    name,
    position,
    fill,
    line: line ?? { style: "solid", fill: fill, width: 0 },
  });
}

function addRule(slide, left, top, width, color = C.orange, height = 4) {
  return addRect(slide, { left, top, width, height }, color);
}

function addSectionHeading(slide, index, title, top) {
  addRule(slide, 42, top + 4, 7, C.orange, 30);
  addText(
    slide,
    `${index}. ${title}`,
    { left: 60, top, width: 1020, height: 38 },
    { fontSize: 27, bold: true, color: C.navy }
  );
}

function parsePriceCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = i === 0 ? values[i] : Number(values[i]);
    }
    return row;
  });
}

function annualGrowth(rows) {
  const first = rows[0];
  const annual = new Map();
  for (const row of rows) annual.set(row.Date.slice(0, 4), row);
  const years = Array.from(annual.keys()).sort();
  return {
    years,
    QQQ: years.map((year) => annual.get(year).QQQ / first.QQQ),
    SPY: years.map((year) => annual.get(year).SPY / first.SPY),
    TLT: years.map((year) => annual.get(year).TLT / first.TLT),
  };
}

function styleTable(table) {
  table.borders.assign({ style: "solid", fill: C.light, width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: 6 }).assign({
    fill: C.light,
    textStyle: { typeface: FONT, fontSize: 16, bold: true, fill: C.navy },
    margins: { top: 6, right: 6, bottom: 6, left: 6 },
    anchor: "middle",
  });
  table.cells.block({ row: 1, column: 0, rowCount: 3, columnCount: 6 }).assign({
    fill: C.white,
    textStyle: { typeface: FONT, fontSize: 16, fill: C.ink },
    margins: { top: 6, right: 6, bottom: 6, left: 6 },
    anchor: "middle",
  });
  table.cells.block({ row: 2, column: 0, rowCount: 1, columnCount: 6 }).assign({
    fill: C.tealSoft,
    textStyle: { typeface: FONT, fontSize: 16, bold: true, fill: C.navy },
    margins: { top: 6, right: 6, bottom: 6, left: 6 },
    anchor: "middle",
  });
  table.cells.block({ row: 1, column: 0, rowCount: 3, columnCount: 1 }).assign({
    textStyle: { typeface: FONT, fontSize: 16, bold: true, fill: C.navy },
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const prices = parsePriceCsv(await fs.readFile(path.join(ROOT, "etf_price.csv"), "utf8"));
  const growth = annualGrowth(prices);
  const frontierBytes = await readImageBlob(path.join(ROOT, "outputs", "week7", "efficient_frontier.png"));
  const sourceNotes = await fs.readFile(path.join(TMP, "source-notes.txt"), "utf8");

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;

  // Header
  addRect(slide, { left: 0, top: 0, width: W, height: 154 }, C.navy, "header-band");
  addRule(slide, 0, 150, W, C.orange, 4);
  addText(
    slide,
    "벌꿀오소리의 마지막 브레이크",
    { left: 42, top: 25, width: 720, height: 67 },
    { fontSize: 54, bold: true, color: C.white },
    "poster-title"
  );
  addText(
    slide,
    "SPY·QQQ·TLT를 활용한 ETF 포트폴리오의 수익-위험 분석 및 최적화",
    { left: 45, top: 97, width: 720, height: 34 },
    { fontSize: 23, color: "#D9E2EC" },
    "poster-subtitle"
  );
  addRule(slide, 800, 28, 5, C.orange, 94);
  addText(
    slide,
    "QQQ에 집중해 얻은 추가 수익은\n더 큰 변동성과 낙폭을 감수할 만큼 컸는가?",
    { left: 823, top: 28, width: 258, height: 100 },
    { fontSize: 21, bold: true, color: C.white, verticalAlignment: "middle" },
    "research-question-header"
  );

  // Research question and method
  addText(
    slide,
    "연구 질문",
    { left: 42, top: 176, width: 170, height: 32 },
    { fontSize: 24, bold: true, color: C.navy }
  );
  addText(
    slide,
    "가장 많이 오른 자산에 집중하는 것이 정말 최선인가?",
    { left: 42, top: 215, width: 585, height: 40 },
    { fontSize: 28, bold: true, color: C.ink }
  );
  addText(
    slide,
    "수익률뿐 아니라 변동성, 최대낙폭(MDD), Sharpe Ratio를 함께 비교해\n집중과 분산 사이의 교환관계를 확인했다.",
    { left: 42, top: 262, width: 610, height: 52 },
    { fontSize: 18, color: C.muted, lineSpacing: 1.1 }
  );

  addText(
    slide,
    "데이터와 방법",
    { left: 690, top: 176, width: 190, height: 32 },
    { fontSize: 24, bold: true, color: C.navy }
  );
  addText(
    slide,
    "SPY · QQQ · TLT  |  2015.01.02-2024.12.30\n2,515거래일  |  연율화 252일  |  무위험수익률 3%\nMonte Carlo 10,000회  |  공매도 없음  |  비중 합 100%\n개별 ETF → 위험 측정 → 전략 비교 → 최적화",
    { left: 690, top: 216, width: 391, height: 86 },
    { fontSize: 17, color: C.ink, lineSpacing: 1.12 }
  );
  addRule(slide, 42, 317, 1039, C.light, 2);

  // Asset section
  addSectionHeading(slide, "01", "QQQ는 가장 많이 올랐고, TLT는 가장 깊게 하락했다", 335);
  addText(
    slide,
    "성장배수 (2015년 초 $1 기준)",
    { left: 42, top: 378, width: 350, height: 28 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  slide.charts.add("line", {
    position: { left: 42, top: 405, width: 650, height: 196 },
    categories: growth.years,
    series: [
      { name: "QQQ", values: growth.QQQ, line: { style: "solid", fill: C.blue, width: 3 } },
      { name: "SPY", values: growth.SPY, line: { style: "solid", fill: C.orange, width: 3 } },
      { name: "TLT", values: growth.TLT, line: { style: "solid", fill: C.green, width: 3 } },
    ],
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 14 } },
    xAxis: {
      textStyle: { fill: C.muted, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 6,
      majorUnit: 1,
      textStyle: { fill: C.muted, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0.0x",
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });

  addText(
    slide,
    "최대낙폭 크기 (%)",
    { left: 720, top: 378, width: 250, height: 28 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  slide.charts.add("bar", {
    position: { left: 720, top: 405, width: 361, height: 196 },
    categories: ["QQQ", "SPY", "TLT"],
    series: [{
      name: "MDD",
      values: [35.12, 33.72, 48.35],
      fill: C.blue,
      valuesFormatCode: "0.0",
      points: [
        { idx: 0, fill: C.blue },
        { idx: 1, fill: C.orange },
        { idx: 2, fill: C.green },
      ],
    }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 50, varyColors: true },
    hasLegend: false,
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 14 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 55,
      majorUnit: 10,
      textStyle: { fill: C.muted, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: C.ink, fontSize: 13, bold: true },
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });
  addText(
    slide,
    "QQQ 누적수익률 441.24% · TLT 누적수익률 -11.29%, MDD -48.35%",
    { left: 42, top: 607, width: 1039, height: 27 },
    { fontSize: 17, bold: true, color: C.navy, alignment: "center" }
  );

  // Strategy section
  addSectionHeading(slide, "02", "분산은 수익을 낮췄지만 집중 위험과 낙폭도 줄였다", 646);
  const strategyTable = slide.tables.add({
    rows: 4,
    columns: 6,
    left: 42,
    top: 691,
    width: 1039,
    height: 145,
    columnTracks: [
      { mode: "fr", value: 0.9 },
      { mode: "fr", value: 2.1 },
      { mode: "fr", value: 1.2 },
      { mode: "fr", value: 1.2 },
      { mode: "fr", value: 1.05 },
      { mode: "fr", value: 0.9 },
    ],
    values: [
      ["성향", "전략 구성", "누적수익률", "변동성", "MDD", "Sharpe"],
      ["공격형", "A · QQQ 100%", "441.24%", "21.82%", "-35.12%", "0.75"],
      ["균형형", "B · SPY 50% + QQQ 50%", "333.37%", "19.37%", "-30.86%", "0.70"],
      ["안정형", "C · SPY 60% + TLT 40%", "115.32%", "11.05%", "-27.24%", "0.48"],
    ],
  });
  styleTable(strategyTable);

  addText(
    slide,
    "연율화 위험-수익 지도  (x: 변동성, y: 수익률)",
    { left: 42, top: 854, width: 300, height: 28 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  slide.charts.add("scatter", {
    position: { left: 42, top: 883, width: 630, height: 229 },
    series: [
      {
        name: "Strategy A",
        xValues: [21.82],
        values: [19.32],
        fill: C.blue,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Strategy B",
        xValues: [19.37],
        values: [16.59],
        fill: C.orange,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Strategy C",
        xValues: [11.05],
        values: [8.3],
        fill: C.green,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Max Sharpe",
        xValues: [21.6],
        values: [19.14],
        fill: C.red,
        marker: { symbol: "diamond", size: 11 },
      },
      {
        name: "Min Volatility",
        xValues: [10.29],
        values: [6.18],
        fill: C.purple,
        marker: { symbol: "diamond", size: 11 },
      },
    ],
    scatterOptions: { style: "marker", varyColors: true },
    hasLegend: true,
    legend: { position: "right", overlay: false, textStyle: { fill: C.muted, fontSize: 13 } },
    xAxis: {
      min: 8,
      max: 24,
      majorUnit: 4,
      textStyle: { fill: C.muted, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    yAxis: {
      min: 4,
      max: 22,
      majorUnit: 4,
      textStyle: { fill: C.muted, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });
  addText(
    slide,
    "A ≈ Max Sharpe",
    { left: 485, top: 900, width: 150, height: 26 },
    { fontSize: 16, bold: true, color: C.red, alignment: "center" }
  );

  addRule(slide, 700, 874, 381, C.light, 2);
  addText(
    slide,
    "Strategy A → Strategy B",
    { left: 700, top: 889, width: 381, height: 35 },
    { fontSize: 24, bold: true, color: C.navy }
  );
  addText(
    slide,
    "덜 벌고",
    { left: 700, top: 940, width: 110, height: 25 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  addText(
    slide,
    "441% → 333%",
    { left: 810, top: 934, width: 250, height: 35 },
    { fontSize: 27, bold: true, color: C.orange }
  );
  addText(
    slide,
    "덜 흔들리고",
    { left: 700, top: 987, width: 125, height: 25 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  addText(
    slide,
    "21.82% → 19.37%",
    { left: 825, top: 981, width: 235, height: 35 },
    { fontSize: 25, bold: true, color: C.teal }
  );
  addText(
    slide,
    "덜 떨어졌다",
    { left: 700, top: 1034, width: 125, height: 25 },
    { fontSize: 17, bold: true, color: C.muted }
  );
  addText(
    slide,
    "-35.12% → -30.86%",
    { left: 810, top: 1028, width: 271, height: 35 },
    { fontSize: 23, bold: true, color: C.teal }
  );
  addText(
    slide,
    "Sharpe는 0.75에서 0.70으로 0.05 낮아졌다.",
    { left: 700, top: 1075, width: 381, height: 27 },
    { fontSize: 16, color: C.muted }
  );

  // Optimization section
  addSectionHeading(slide, "03", "과거 데이터의 최대 Sharpe는 QQQ 99%로 수렴했다", 1130);
  slide.images.add({
    blob: frontierBytes,
    contentType: "image/png",
    alt: "10,000개 Monte Carlo 포트폴리오의 Efficient Frontier와 최적 포트폴리오",
    fit: "contain",
    position: { left: 42, top: 1173, width: 478, height: 190 },
  });
  addText(
    slide,
    "10,000개 포트폴리오의 Efficient Frontier",
    { left: 42, top: 1368, width: 478, height: 24 },
    { fontSize: 15, color: C.muted, alignment: "center" }
  );

  slide.charts.add("bar", {
    position: { left: 545, top: 1173, width: 536, height: 190 },
    categories: ["Max Sharpe", "Min Volatility"],
    series: [
      {
        name: "SPY",
        values: [0.0007, 0.445],
        fill: C.blue,
      },
      {
        name: "QQQ",
        values: [0.99, 0.0014],
        fill: C.orange,
      },
      {
        name: "TLT",
        values: [0.0093, 0.5535],
        fill: C.green,
      },
    ],
    barOptions: { direction: "column", grouping: "stacked", gapWidth: 45 },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 13 } },
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 13 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 1,
      majorUnit: 0.2,
      textStyle: { fill: C.muted, fontSize: 11 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0%",
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });
  addText(
    slide,
    "QQQ 99.0%",
    { left: 636, top: 1270, width: 175, height: 28 },
    { fontSize: 16, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "TLT 55.4%",
    { left: 855, top: 1234, width: 175, height: 28 },
    { fontSize: 16, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "SPY 44.5%",
    { left: 855, top: 1302, width: 175, height: 28 },
    { fontSize: 16, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "최적화는 새로운 분산 조합보다 분석 기간 동안 우수했던 QQQ의 성과를 재확인했다.",
    { left: 545, top: 1368, width: 536, height: 29 },
    { fontSize: 15, color: C.muted, alignment: "center" }
  );

  // Conclusion and limitations
  addRect(slide, { left: 0, top: 1415, width: W, height: 132 }, C.navy, "conclusion-band");
  addText(
    slide,
    "결론",
    { left: 42, top: 1434, width: 100, height: 30 },
    { fontSize: 23, bold: true, color: C.orange }
  );
  addText(
    slide,
    "공격적인 투자를 멈추는 것이 아니라,\n집중으로 얻는 추가 수익과 감수할 하락폭을 함께 확인해야 한다.",
    { left: 42, top: 1468, width: 675, height: 66 },
    { fontSize: 23, bold: true, color: C.white }
  );
  addRule(slide, 750, 1438, 3, "#486581", 82);
  addText(
    slide,
    "한계\n- 동일 기간으로 최적화·평가\n- 거래비용·세금 미반영\n- 매일 고정 비중 재조정 가정\n- 3개 ETF, 무위험수익률 3% 고정",
    { left: 776, top: 1432, width: 305, height: 96 },
    { fontSize: 15, color: "#D9E2EC", lineSpacing: 1.02 }
  );

  addText(
    slide,
    "자료: Yahoo Finance via yfinance  |  분석: Python, pandas, NumPy  |  분석 기간: 2015.01.02-2024.12.30",
    { left: 42, top: 1557, width: 1039, height: 22 },
    { fontSize: 13, color: C.muted, alignment: "center" }
  );

  slide.speakerNotes.textFrame.setText(sourceNotes);
  slide.speakerNotes.setVisible(true);

  const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
  await writeBlob(path.join(TMP, "poster-preview.png"), preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(TMP, "poster-layout.json"), await layout.text());
  const snapshot = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 16000,
  });
  await fs.writeFile(path.join(TMP, "poster-inspect.ndjson"), snapshot.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
