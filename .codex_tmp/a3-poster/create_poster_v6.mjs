import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\Insun\\Last-break-of-Honeybadger";
const TMP = path.join(ROOT, ".codex_tmp", "a3-poster");
const OUT = path.join(ROOT, "outputs", "poster");
const FINAL_PPTX = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v7.pptx");
const PREVIEW_PNG = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v7_preview.png");

const W = 1123;
const H = 1587;
const FONT = "Noto Sans KR";

const C = {
  navy: "#102A43",
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

function addPanel(slide, position, fill = C.white, lineColor = C.light) {
  return addRect(
    slide,
    position,
    fill,
    undefined,
    { style: "solid", fill: lineColor, width: 1 }
  );
}

function addSectionHeading(slide, index, label, title, top) {
  addRule(slide, 42, top + 3, 7, C.orange, 31);
  addText(
    slide,
    `${index}. ${label}`,
    { left: 60, top, width: 158, height: 37 },
    { fontSize: 24, bold: true, color: C.orange }
  );
  addText(
    slide,
    title,
    { left: 218, top, width: 863, height: 38 },
    { fontSize: 24, bold: true, color: C.navy }
  );
}

function addSubheading(slide, title, left, top, width, color = C.navy) {
  addRule(slide, left, top + 3, 4, C.orange, 22);
  addText(
    slide,
    title,
    { left: left + 12, top, width: width - 12, height: 28 },
    { fontSize: 18, bold: true, color }
  );
}

function parseAnnualCumulative(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i] || "Date";
      row[key] = i === 0 ? values[i] : Number(values[i]);
    }
    return row;
  });
  const annual = new Map();
  for (const row of rows) annual.set(row.Date.slice(0, 4), row);
  const years = Array.from(annual.keys()).sort();
  return {
    years,
    A: years.map((year) => annual.get(year)["Strategy A"]),
    B: years.map((year) => annual.get(year)["Strategy B"]),
    C: years.map((year) => annual.get(year)["Strategy C"]),
    Max: years.map((year) => annual.get(year)["Max Sharpe"]),
    Min: years.map((year) => annual.get(year)["Min Volatility"]),
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const sourceNotes = await fs.readFile(path.join(TMP, "source-notes.txt"), "utf8");
  const frontierBytes = await readImageBlob(path.join(ROOT, "outputs", "week7", "efficient_frontier.png"));
  const cumulative = parseAnnualCumulative(
    await fs.readFile(path.join(ROOT, "outputs", "week8", "week8_cumulative_returns.csv"), "utf8")
  );

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;

  // Header
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
    "연구 질문\n높은 성장성을 지키면서\n어디까지 위험을 줄일 수 있을까?",
    { left: 823, top: 24, width: 259, height: 99 },
    { fontSize: 19, bold: true, color: C.white, verticalAlignment: "middle", lineSpacing: 1.04 },
    "research-question-header"
  );

  // 01 Problem
  addSectionHeading(slide, "01", "문제 제기", "가장 많이 오른 자산이 모두에게 좋은 전략은 아니다", 165);
  addText(
    slide,
    "분석 기간에는 기술주 중심의 QQQ가 가장 크게 성장했다. 하지만 수익이 높았던 만큼 가격도 크게 흔들렸고, 하락기에는 자산가치가 고점에서 약 3분의 1 줄어들었다. 그래서 이 프로젝트는 단순히 ‘무엇이 가장 많이 올랐는가’를 고르는 대신, 분산 수준을 높일 때 성장성이 얼마나 남고 실제 손실이 얼마나 줄어드는지를 확인했다.",
    { left: 42, top: 213, width: 694, height: 85 },
    { fontSize: 16, color: C.ink, lineSpacing: 1.08 }
  );
  addPanel(slide, { left: 766, top: 210, width: 315, height: 96 }, C.orangeSoft, C.orange);
  addText(
    slide,
    "쉽게 말하면\n• 몰아서 투자한 경우\n• 주식 안에서 나눈 경우\n• 주식과 채권으로 나눈 경우\n세 단계의 결과를 비교했다.",
    { left: 785, top: 225, width: 278, height: 66 },
    { fontSize: 15, bold: true, color: C.navy, lineSpacing: 1.06 }
  );

  // 02 Strategy design
  addSectionHeading(slide, "02", "전략 설계", "세 비율은 정답이 아니라 분산 효과를 비교하기 위한 실험 조건이다", 327);
  addText(
    slide,
    "SPY = 미국 주식시장 전반  |  QQQ = 기술·성장주 중심  |  TLT = 미국 장기국채",
    { left: 42, top: 372, width: 1039, height: 20 },
    { fontSize: 13, bold: true, color: C.muted, alignment: "center" }
  );
  slide.charts.add("bar", {
    position: { left: 42, top: 401, width: 408, height: 203 },
    categories: ["A 공격형", "B 균형형", "C 방어형"],
    series: [
      { name: "SPY", values: [0, 0.5, 0.6], fill: C.blue },
      { name: "QQQ", values: [1, 0.5, 0], fill: C.orange },
      { name: "TLT", values: [0, 0, 0.4], fill: C.green },
    ],
    barOptions: { direction: "column", grouping: "stacked", gapWidth: 38 },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 10 } },
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 10 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 1,
      majorUnit: 0.25,
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
    "QQQ 100%",
    { left: 78, top: 489, width: 110, height: 20 },
    { fontSize: 12, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "SPY 50%\nQQQ 50%",
    { left: 184, top: 471, width: 110, height: 37 },
    { fontSize: 11, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "SPY 60%\nTLT 40%",
    { left: 292, top: 470, width: 110, height: 37 },
    { fontSize: 11, bold: true, color: C.white, alignment: "center" }
  );

  addSubheading(slide, "왜 이 비율을 선택했는가", 480, 404, 601);
  addText(
    slide,
    "A · QQQ 100%\nQQQ만 보유해 성장 가능성과 집중 위험의 상한선을 확인했다.\n\nB · SPY 50% + QQQ 50%\nQQQ의 성장 노출을 절반 남기고 나머지를 시장 전체로 넓혔다. 50:50은 채권 없이 ‘집중만 줄인 효과’를 보기 위한 단순한 중간점이다.\n\nC · SPY 60% + TLT 40%\n주식을 과반으로 유지하면서 채권을 40% 넣었다. 자산군을 나누는 것이 큰 하락을 실제로 막는지 확인하기 위한 방어 조건이다.",
    { left: 480, top: 442, width: 601, height: 158 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.05 }
  );
  addRect(slide, { left: 42, top: 613, width: 1039, height: 34 }, C.tealSoft);
  addText(
    slide,
    "따라서 A→B→C는 ‘집중 투자 → 주식 내 분산 → 주식·채권 분산’으로 위험 완화 단계를 하나씩 높인 비교 실험이다.",
    { left: 60, top: 621, width: 1003, height: 19 },
    { fontSize: 13, bold: true, color: C.navy, alignment: "center" }
  );

  // 03 Optimization method
  addSectionHeading(slide, "03", "최적화", "직접 만든 세 전략을 넘어 10,000개 조합에서 최적점을 찾았다", 670);
  addPanel(slide, { left: 42, top: 716, width: 396, height: 240 }, C.white);
  addSubheading(slide, "Monte Carlo 시뮬레이션", 60, 734, 360);
  addText(
    slide,
    "1  세 ETF의 비중을 무작위로 정하되 합계는 항상 100%가 되게 했다. 빌려서 투자하는 공매도는 제외했다.\n\n2  서로 다른 포트폴리오 10,000개를 만들고, 각 조합이 얼마나 벌고 얼마나 흔들리는지 계산했다.\n\n3  위험 한 단위당 수익이 가장 좋은 점을 Max Sharpe, 가장 덜 흔들리는 점을 Min Volatility로 선택했다.\n\n이렇게 사람이 만든 A·B·C와 데이터가 고른 최적점을 같은 기준으로 비교했다.",
    { left: 60, top: 775, width: 360, height: 164 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.07 }
  );
  slide.images.add({
    blob: frontierBytes,
    contentType: "image/png",
    alt: "SPY, QQQ, TLT 비중을 무작위로 조합한 10,000개 포트폴리오와 Max Sharpe, Min Volatility 최적점",
    fit: "contain",
    position: { left: 576, top: 716, width: 395, height: 221 },
  });
  addText(
    slide,
    "점 하나 = 포트폴리오 한 조합  |  오른쪽 위 빨간 별 = Max Sharpe  |  왼쪽 주황 X = Min Volatility",
    { left: 500, top: 939, width: 546, height: 17 },
    { fontSize: 10, bold: true, color: C.muted, alignment: "center" }
  );

  // 04 Results
  addSectionHeading(slide, "04", "결과", "A는 성장 프리미엄에 집중했고, B는 일부 수익으로 집중위험을 낮췄다", 979);
  addText(
    slide,
    "시간이 지나며 1달러가 얼마나 불어났는가",
    { left: 42, top: 1025, width: 516, height: 22 },
    { fontSize: 14, bold: true, color: C.muted }
  );
  slide.charts.add("line", {
    position: { left: 42, top: 1050, width: 516, height: 190 },
    categories: cumulative.years,
    series: [
      { name: "A", values: cumulative.A, line: { style: "solid", fill: C.blue, width: 3 } },
      { name: "B", values: cumulative.B, line: { style: "solid", fill: C.orange, width: 3 } },
      { name: "C", values: cumulative.C, line: { style: "solid", fill: C.green, width: 3 } },
      { name: "Max", values: cumulative.Max, line: { style: "solid", fill: C.red, width: 2 } },
      { name: "Min Vol.", values: cumulative.Min, line: { style: "solid", fill: C.purple, width: 2 } },
    ],
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 9 } },
    xAxis: {
      textStyle: { fill: C.muted, fontSize: 8 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0.5,
      max: 6,
      majorUnit: 1,
      textStyle: { fill: C.muted, fontSize: 8 },
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
    "고점에서 가장 크게 떨어진 폭  |  짧을수록 방어적",
    { left: 585, top: 1025, width: 496, height: 22 },
    { fontSize: 14, bold: true, color: C.muted }
  );
  slide.charts.add("bar", {
    position: { left: 585, top: 1050, width: 496, height: 190 },
    categories: ["A", "B", "C", "Max", "Min Vol."],
    series: [{
      name: "최대 손실 폭",
      values: [35.12, 30.86, 27.24, 35.07, 29.20],
      fill: C.blue,
      points: [
        { idx: 0, fill: C.blue },
        { idx: 1, fill: C.orange },
        { idx: 2, fill: C.green },
        { idx: 3, fill: C.red },
        { idx: 4, fill: C.purple },
      ],
    }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 38, varyColors: true },
    hasLegend: false,
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 40,
      majorUnit: 10,
      textStyle: { fill: C.muted, fontSize: 8 },
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
    "A는 QQQ의 성장 프리미엄에 집중한 전략이다. 높은 기대수익은 기술·성장주 한 방향에 몰린 위험을 감수한 대가다. Max Sharpe가 A와 거의 같았다는 것은 분석 기간에는 이 집중의 보상이 위험보다 강하게 평가됐다는 뜻이다.\n\nB는 성장 프리미엄의 일부를 기회비용으로 지불해 QQQ 집중위험을 낮췄다. 그러나 SPY와 QQQ가 모두 주식이므로 시장 전체가 하락하는 위험까지 없애는 보험은 아니다. B가 산 것은 ‘완전한 안전’이 아니라 집중위험의 일부 완화다.\n\n따라서 B가 A보다 항상 우월한 것은 아니다. 손실 제약이 없다면 이 기간의 위험조정성과는 A가 더 좋았고, 큰 낙폭을 제한해야 할 때만 B의 낮은 절대위험이 경제적 가치를 가진다. C와 Min Volatility는 더 강한 방어를 위해 성장의 기회비용을 더 크게 지불한 경우다.",
    { left: 42, top: 1252, width: 1039, height: 104 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.06 }
  );

  // 05 Conclusion
  addSectionHeading(slide, "05", "결론", "손실 감내도는 참는 힘이 아니라 강제매도를 피할 수 있는 ‘손실예산’이다", 1378);
  addRect(slide, { left: 42, top: 1424, width: 1039, height: 128 }, C.navy, "conclusion-band");
  addText(
    slide,
    "손실예산으로 선택하면",
    { left: 60, top: 1441, width: 235, height: 28 },
    { fontSize: 20, bold: true, color: C.orange }
  );
  addText(
    slide,
    "• 역사적 최대낙폭 약 35% 이상을 감당할 손실예산이면 A를 선택할 수 있다.\n• 손실예산이 약 31~35%라면 A는 한도를 넘고 B만 범위 안에 들어온다.\n• 손실예산이 약 31%보다 작다면 A와 B 모두 기준을 충족하지 못한다.\n• 이 기준은 과거 표본에 근거한 출발점이며 미래 손실을 보장하지 않는다.",
    { left: 60, top: 1475, width: 662, height: 65 },
    { fontSize: 14, bold: true, color: C.white, lineSpacing: 1.04 }
  );
  addRule(slide, 744, 1441, 2, "#486581", 92);
  addText(
    slide,
    "손실예산이란?\n고점 대비 손실이 발생해도\n생활자금·부채상환·투자기간 때문에\n강제매도하지 않고 전략을 유지할 수 있는\n최대 손실 한도다.",
    { left: 769, top: 1445, width: 286, height: 80 },
    { fontSize: 15, bold: true, color: "#D9E2EC", alignment: "center", lineSpacing: 1.08 }
  );

  addText(
    slide,
    "한계: 동일 기간 최적화·평가, 비용·세금 미반영, 매일 재조정, 3개 ETF·무위험수익률 3% 고정  |  후속: 롤링·표본외 검증, 거래비용·재조정 주기 반영",
    { left: 42, top: 1557, width: 1039, height: 11 },
    { fontSize: 8, color: C.muted, alignment: "center" }
  );
  addText(
    slide,
    "자료: Yahoo Finance via yfinance  |  분석: Python · pandas · NumPy  |  분석 기간: 2015.01.02–2024.12.30",
    { left: 42, top: 1573, width: 1039, height: 10 },
    { fontSize: 7, color: C.muted, alignment: "center" }
  );

  slide.speakerNotes.textFrame.setText(sourceNotes);
  slide.speakerNotes.setVisible(true);

  const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
  await writeBlob(PREVIEW_PNG, preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(TMP, "poster-v7-layout.json"), await layout.text());
  const snapshot = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 30000,
  });
  await fs.writeFile(path.join(TMP, "poster-v7-inspect.ndjson"), snapshot.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
