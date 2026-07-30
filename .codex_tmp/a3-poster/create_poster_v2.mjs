import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\Insun\\Last-break-of-Honeybadger";
const TMP = path.join(ROOT, ".codex_tmp", "a3-poster");
const OUT = path.join(ROOT, "outputs", "poster");
const FINAL_PPTX = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v2.pptx");
const PREVIEW_PNG = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v2_preview.png");

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
    line: line ?? { style: "solid", fill, width: 0 },
  });
}

function addRule(slide, left, top, width, color = C.orange, height = 4) {
  return addRect(slide, { left, top, width, height }, color);
}

function addSectionHeading(slide, index, title, top) {
  addRule(slide, 42, top + 2, 7, C.orange, 31);
  addText(
    slide,
    `${index}. ${title}`,
    { left: 60, top, width: 1020, height: 39 },
    { fontSize: 26, bold: true, color: C.navy }
  );
}

function addPanel(slide, position, fill = C.white, lineColor = C.light) {
  return addRect(
    slide,
    position,
    fill,
    undefined,
    { style: "solid", fill: lineColor, width: 1 }
  );
}

function addSubheading(slide, text, left, top, width, color = C.navy) {
  addRule(slide, left, top + 3, 4, C.orange, 22);
  addText(
    slide,
    text,
    { left: left + 12, top, width: width - 12, height: 28 },
    { fontSize: 19, bold: true, color }
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

function styleStrategyTable(table) {
  table.borders.assign({ style: "solid", fill: C.light, width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: 7 }).assign({
    fill: C.light,
    textStyle: { typeface: FONT, fontSize: 13, bold: true, fill: C.navy },
    margins: { top: 5, right: 4, bottom: 5, left: 4 },
    anchor: "middle",
  });
  table.cells.block({ row: 1, column: 0, rowCount: 3, columnCount: 7 }).assign({
    fill: C.white,
    textStyle: { typeface: FONT, fontSize: 14, fill: C.ink },
    margins: { top: 5, right: 4, bottom: 5, left: 4 },
    anchor: "middle",
  });
  table.cells.block({ row: 2, column: 0, rowCount: 1, columnCount: 7 }).assign({
    fill: C.tealSoft,
    textStyle: { typeface: FONT, fontSize: 14, bold: true, fill: C.navy },
    margins: { top: 5, right: 4, bottom: 5, left: 4 },
    anchor: "middle",
  });
  table.cells.block({ row: 1, column: 0, rowCount: 3, columnCount: 1 }).assign({
    textStyle: { typeface: FONT, fontSize: 14, bold: true, fill: C.navy },
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

  // Header: title metaphor is explained once; the rest of the poster remains academic.
  addRect(slide, { left: 0, top: 0, width: W, height: 145 }, C.navy, "header-band");
  addRule(slide, 0, 141, W, C.orange, 4);
  addText(
    slide,
    "벌꿀오소리의 마지막 브레이크",
    { left: 42, top: 22, width: 715, height: 62 },
    { fontSize: 50, bold: true, color: C.white },
    "poster-title"
  );
  addText(
    slide,
    "공격적으로 투자하기 전, SPY·QQQ·TLT로 확인한 수익–위험의 마지막 점검",
    { left: 45, top: 91, width: 720, height: 31 },
    { fontSize: 21, color: "#D9E2EC" },
    "poster-subtitle"
  );
  addRule(slide, 800, 25, 5, C.orange, 92);
  addText(
    slide,
    "연구 질문\nQQQ 집중의 추가 수익은\n변동성·낙폭을 감수할 만큼 충분한가?",
    { left: 823, top: 24, width: 259, height: 99 },
    { fontSize: 19, bold: true, color: C.white, verticalAlignment: "middle", lineSpacing: 1.04 },
    "research-question-header"
  );

  // Background and method
  addPanel(slide, { left: 42, top: 164, width: 506, height: 211 }, C.white);
  addSubheading(slide, "연구 배경과 목적", 59, 180, 470);
  addText(
    slide,
    "성장주가 주도한 구간에서는 수익률만 보면 QQQ 집중이 가장 합리적으로 보인다. 그러나 투자자가 실제로 견뎌야 하는 위험은 연간 변동성뿐 아니라 고점 이후 하락 폭과 회복 부담까지 포함한다.\n\n본 연구는 SPY(미국 대형주), QQQ(기술주 중심), TLT(미 장기국채)를 같은 기간에 비교해 집중이 만든 추가 보상과 분산이 줄인 위험을 수치로 분리한다. 또한 임의 전략과 수학적 최적해를 함께 놓아 ‘최고 수익’과 ‘실행 가능한 선택’이 같은지 검토했다.",
    { left: 59, top: 216, width: 472, height: 142 },
    { fontSize: 16, color: C.ink, lineSpacing: 1.08 }
  );

  addPanel(slide, { left: 568, top: 164, width: 513, height: 211 }, C.white);
  addSubheading(slide, "데이터와 분석 설계", 585, 180, 478);
  addText(
    slide,
    "대상·기간  SPY · QQQ · TLT  |  2015.01.02–2024.12.30  |  2,515거래일\n수익률  r(t) = P(t) / P(t−1) − 1\n연율수익률  평균 일수익률 × 252\n변동성  일수익률 표준편차 × √252\n최대낙폭(MDD)  누적가치의 고점 대비 최대 하락률\nSharpe  (연율수익률 − 무위험수익률 3%) / 변동성\n\n비교 전략은 매일 고정 비중으로 재조정했다. 최적화는 공매도 없이 비중 합계가 100%인 10,000개 포트폴리오를 무작위 생성해 수행했다.",
    { left: 585, top: 215, width: 478, height: 146 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.03 }
  );

  // 01 Assets
  addSectionHeading(slide, "01", "개별 자산에서는 높은 수익과 낮은 위험이 동시에 나타나지 않았다", 397);
  addPanel(slide, { left: 42, top: 441, width: 563, height: 350 }, C.white);
  addText(
    slide,
    "QQQ | 수익을 높였지만 손실 범위도 컸다",
    { left: 59, top: 457, width: 526, height: 26 },
    { fontSize: 18, bold: true, color: C.blue }
  );
  addText(
    slide,
    "연율수익률 19.32%, 누적수익률 441.24%로 세 자산 중 가장 높았다. 동시에 변동성 21.82%, MDD −35.12%를 기록했다. 높은 성장 보상은 컸지만, 한 번의 큰 하락을 버틸 수 있어야 실현 가능한 성과였다.",
    { left: 59, top: 487, width: 526, height: 61 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.05 }
  );
  addRule(slide, 59, 555, 526, C.light, 1);
  addText(
    slide,
    "SPY | 수익과 위험의 중간 기준점",
    { left: 59, top: 564, width: 526, height: 25 },
    { fontSize: 18, bold: true, color: C.orange }
  );
  addText(
    slide,
    "연율수익률 13.85%, 누적수익률 240.81%, 변동성 17.62%, MDD −33.72%였다. QQQ보다 수익과 변동성이 모두 낮아, 집중 전략을 평가하는 시장 기준선 역할을 했다.",
    { left: 59, top: 593, width: 526, height: 52 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.05 }
  );
  addRule(slide, 59, 652, 526, C.light, 1);
  addText(
    slide,
    "TLT | 낮은 변동성이 작은 낙폭을 보장하지 않았다",
    { left: 59, top: 661, width: 526, height: 25 },
    { fontSize: 18, bold: true, color: C.green }
  );
  addText(
    slide,
    "연율수익률 −0.03%, 누적수익률 −11.29%, 변동성 15.32%였지만 MDD는 −48.35%로 가장 깊었다.",
    { left: 59, top: 688, width: 526, height: 51 },
    { fontSize: 15, color: C.ink }
  );

  addText(
    slide,
    "누적 성장배수 (2015년 초 = 1)",
    { left: 629, top: 443, width: 454, height: 23 },
    { fontSize: 15, bold: true, color: C.muted }
  );
  slide.charts.add("line", {
    position: { left: 629, top: 469, width: 452, height: 132 },
    categories: growth.years,
    series: [
      { name: "QQQ", values: growth.QQQ, line: { style: "solid", fill: C.blue, width: 3 } },
      { name: "SPY", values: growth.SPY, line: { style: "solid", fill: C.orange, width: 3 } },
      { name: "TLT", values: growth.TLT, line: { style: "solid", fill: C.green, width: 3 } },
    ],
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 11 } },
    xAxis: {
      textStyle: { fill: C.muted, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 6,
      majorUnit: 2,
      textStyle: { fill: C.muted, fontSize: 9 },
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
    "최대낙폭의 크기 (%)",
    { left: 629, top: 609, width: 454, height: 23 },
    { fontSize: 15, bold: true, color: C.muted }
  );
  slide.charts.add("bar", {
    position: { left: 629, top: 634, width: 452, height: 105 },
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
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 55, varyColors: true },
    hasLegend: false,
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 11 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 55,
      majorUnit: 20,
      textStyle: { fill: C.muted, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: C.ink, fontSize: 10, bold: true },
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });
  addRect(slide, { left: 629, top: 749, width: 452, height: 42 }, C.orangeSoft);
  addText(
    slide,
    "해석 포인트  변동성은 ‘흔들림’, MDD는 ‘최악의 낙폭’을 측정한다. TLT는 변동성이 낮아도 MDD가 가장 컸으므로 두 지표를 함께 봐야 한다.",
    { left: 643, top: 758, width: 424, height: 27 },
    { fontSize: 13, bold: true, color: C.navy, lineSpacing: 1.02 }
  );

  // 02 Manual strategies
  addSectionHeading(slide, "02", "분산의 효과는 수익 감소와 위험 완화의 교환관계로 나타났다", 812);
  const strategyTable = slide.tables.add({
    rows: 4,
    columns: 7,
    left: 42,
    top: 855,
    width: 1039,
    height: 133,
    columnTracks: [
      { mode: "fr", value: 0.72 },
      { mode: "fr", value: 1.88 },
      { mode: "fr", value: 1.05 },
      { mode: "fr", value: 1.05 },
      { mode: "fr", value: 0.95 },
      { mode: "fr", value: 0.9 },
      { mode: "fr", value: 0.72 },
    ],
    values: [
      ["전략", "구성", "연율수익률", "누적수익률", "변동성", "MDD", "Sharpe"],
      ["A", "QQQ 100%", "19.32%", "441.24%", "21.82%", "−35.12%", "0.75"],
      ["B", "SPY 50% + QQQ 50%", "16.59%", "333.37%", "19.37%", "−30.86%", "0.70"],
      ["C", "SPY 60% + TLT 40%", "8.30%", "115.32%", "11.05%", "−27.24%", "0.48"],
    ],
  });
  styleStrategyTable(strategyTable);

  addPanel(slide, { left: 42, top: 1005, width: 563, height: 247 }, C.white);
  addSubheading(slide, "전략별 해석", 59, 1021, 528);
  addText(
    slide,
    "A · 공격형  가장 높은 수익률과 Sharpe를 얻었지만 QQQ 한 자산에 전부 노출된다. 성과가 기술주 상승기에 강하게 의존하므로 손실 감내 능력이 선택의 전제다.\n\nB · 균형형  QQQ 비중을 절반으로 낮추면서 수익의 상당 부분을 유지했다. Sharpe는 0.05만 낮아졌고 변동성과 MDD가 함께 개선되어, 집중 완화와 성장 노출을 동시에 원하는 중간 선택지다.\n\nC · 안정형  수동 전략 중 변동성과 MDD가 가장 낮았다. 다만 TLT의 부진으로 수익률과 Sharpe가 크게 낮아져, 채권 편입의 분산 효과가 항상 무료인 것은 아니었다.",
    { left: 59, top: 1058, width: 528, height: 176 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.06 }
  );

  addPanel(slide, { left: 629, top: 1005, width: 452, height: 247 }, C.tealSoft, C.teal);
  addText(
    slide,
    "핵심 비교 · Strategy A → B",
    { left: 648, top: 1022, width: 414, height: 29 },
    { fontSize: 20, bold: true, color: C.navy }
  );
  addText(
    slide,
    "QQQ 집중도       100%  →  50%\n연율수익률        19.32% → 16.59%   (−2.73%p)\n누적수익률       441.24% → 333.37% (−107.87%p)\n변동성              21.82% → 19.37%   (−2.45%p)\n최대낙폭          −35.12% → −30.86%  (+4.26%p 개선)\nSharpe               0.75 → 0.70          (−0.05)",
    { left: 648, top: 1060, width: 414, height: 126 },
    { fontSize: 15, bold: true, color: C.ink, lineSpacing: 1.12 }
  );
  addRule(slide, 648, 1196, 414, C.teal, 2);
  addText(
    slide,
    "해석  B는 최고 수익을 포기한 대가로 집중도와 하락 위험을 낮췄다. 이것은 ‘A보다 우월하다’는 뜻이 아니라, 목표와 감내 손실이 다르면 합리적 선택도 달라진다는 뜻이다.",
    { left: 648, top: 1205, width: 414, height: 37 },
    { fontSize: 13, color: C.navy, lineSpacing: 1.02 }
  );

  // 03 Optimization
  addSectionHeading(slide, "03", "최적화는 QQQ 집중을 재현했지만 단일 지표가 전체 위험을 설명하지는 못했다", 1272);
  addPanel(slide, { left: 42, top: 1314, width: 568, height: 190 }, C.white);
  addText(
    slide,
    "Max Sharpe | QQQ 99.00% · SPY 0.07% · TLT 0.93%",
    { left: 59, top: 1330, width: 533, height: 24 },
    { fontSize: 17, bold: true, color: C.red }
  );
  addText(
    slide,
    "연율수익률 19.14%, 변동성 21.60%, MDD −35.07%, 누적수익률 434.05%, Sharpe 0.75였다. 과거 성과가 가장 강했던 QQQ 집중을 사실상 다시 선택했다.",
    { left: 59, top: 1359, width: 533, height: 43 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.04 }
  );
  addText(
    slide,
    "Min Volatility | SPY 44.50% · QQQ 0.14% · TLT 55.35%",
    { left: 59, top: 1409, width: 533, height: 24 },
    { fontSize: 17, bold: true, color: C.purple }
  );
  addText(
    slide,
    "연율수익률 6.18%, 변동성 10.29%, MDD −29.20%, 누적수익률 75.64%, Sharpe 0.31이었다. C보다 변동성은 0.76%p 낮았지만 누적수익률은 39.68%p 낮고 MDD는 1.96%p 더 깊었다.",
    { left: 59, top: 1438, width: 533, height: 39 },
    { fontSize: 13, color: C.ink, lineSpacing: 1.03 }
  );
  addRect(slide, { left: 59, top: 1481, width: 533, height: 25 }, C.orangeSoft);
  addText(
    slide,
    "주의  최적화와 평가는 같은 기간을 사용한 in-sample 결과다.\nQQQ 99%는 보편적 정답이 아니라 2015–2024년의 기간 특화 해다.",
    { left: 68, top: 1484, width: 515, height: 19 },
    { fontSize: 10, bold: true, color: C.navy, lineSpacing: 1.0 }
  );

  slide.images.add({
    blob: frontierBytes,
    contentType: "image/png",
    alt: "10,000개 Monte Carlo 포트폴리오의 Efficient Frontier와 최적 포트폴리오",
    fit: "contain",
    position: { left: 629, top: 1318, width: 214, height: 147 },
  });
  addText(
    slide,
    "10,000개 포트폴리오",
    { left: 629, top: 1467, width: 214, height: 20 },
    { fontSize: 11, color: C.muted, alignment: "center" }
  );
  slide.charts.add("bar", {
    position: { left: 858, top: 1318, width: 223, height: 147 },
    categories: ["Max\nSharpe", "Min\nVol."],
    series: [
      { name: "SPY", values: [0.0007, 0.445], fill: C.blue },
      { name: "QQQ", values: [0.99, 0.0014], fill: C.orange },
      { name: "TLT", values: [0.0093, 0.5535], fill: C.green },
    ],
    barOptions: { direction: "column", grouping: "stacked", gapWidth: 35 },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 9 } },
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 1,
      majorUnit: 0.5,
      textStyle: { fill: C.muted, fontSize: 8 },
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
    "최적 포트폴리오 비중",
    { left: 858, top: 1467, width: 223, height: 20 },
    { fontSize: 11, color: C.muted, alignment: "center" }
  );

  // Conclusion, limitations, future work
  addRect(slide, { left: 0, top: 1518, width: W, height: 56 }, C.navy, "conclusion-band");
  addText(
    slide,
    "결론",
    { left: 42, top: 1530, width: 58, height: 24 },
    { fontSize: 18, bold: true, color: C.orange }
  );
  addText(
    slide,
    "가장 높은 수익과 가장 낮은 위험은 동시에 얻어지지 않았다. Strategy B는 Sharpe 0.05를 포기해 집중도와 낙폭을 낮춘 절충안이었다. 선택 기준은 최고 수익률이 아니라 감내 가능한 손실과 투자 목적이어야 한다.",
    { left: 111, top: 1528, width: 600, height: 38 },
    { fontSize: 14, bold: true, color: C.white, verticalAlignment: "middle", lineSpacing: 1.02 }
  );
  addRule(slide, 733, 1529, 2, "#486581", 37);
  addText(
    slide,
    "한계  동일 기간 최적화·평가, 비용·세금 미반영, 매일 재조정, 3개 ETF·무위험수익률 3% 고정\n후속  롤링·표본외 검증, 가변 금리·거래비용, 재조정 주기와 자산군 확장",
    { left: 751, top: 1527, width: 330, height: 41 },
    { fontSize: 11, color: "#D9E2EC", lineSpacing: 1.05 }
  );

  addText(
    slide,
    "자료: Yahoo Finance via yfinance  |  분석: Python · pandas · NumPy  |  분석 기간: 2015.01.02–2024.12.30",
    { left: 42, top: 1576, width: 1039, height: 9 },
    { fontSize: 8, color: C.muted, alignment: "center" }
  );

  slide.speakerNotes.textFrame.setText(sourceNotes);
  slide.speakerNotes.setVisible(true);

  const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
  await writeBlob(PREVIEW_PNG, preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(TMP, "poster-v2-layout.json"), await layout.text());
  const snapshot = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 24000,
  });
  await fs.writeFile(path.join(TMP, "poster-v2-inspect.ndjson"), snapshot.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
