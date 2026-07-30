import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\Insun\\Last-break-of-Honeybadger";
const TMP = path.join(ROOT, ".codex_tmp", "a3-poster");
const OUT = path.join(ROOT, "outputs", "poster");
const FINAL_PPTX = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v3.pptx");
const PREVIEW_PNG = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v3_preview.png");

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

function addSectionHeading(slide, index, title, top) {
  addRule(slide, 42, top + 3, 7, C.orange, 31);
  addText(
    slide,
    `${index}. ${title}`,
    { left: 60, top, width: 1021, height: 39 },
    { fontSize: 25, bold: true, color: C.navy }
  );
}

function addSubheading(slide, title, left, top, width, color = C.navy) {
  addRule(slide, left, top + 3, 4, C.orange, 23);
  addText(
    slide,
    title,
    { left: left + 12, top, width: width - 12, height: 29 },
    { fontSize: 19, bold: true, color }
  );
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const sourceNotes = await fs.readFile(path.join(TMP, "source-notes.txt"), "utf8");

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
    "연구 질문\n분산에 지불한 수익의 비용은\n실제 손실 감소로 돌아왔는가?",
    { left: 823, top: 24, width: 259, height: 99 },
    { fontSize: 19, bold: true, color: C.white, verticalAlignment: "middle", lineSpacing: 1.04 },
    "research-question-header"
  );

  // Opening thesis and method
  addText(
    slide,
    "어떤 자산이 가장 많이 올랐는지가 아니라, 무엇을 포기해 어떤 위험을 줄였는지를 물었다.",
    { left: 42, top: 168, width: 1039, height: 39 },
    { fontSize: 26, bold: true, color: C.navy }
  );
  addRule(slide, 42, 215, 1039, C.light, 2);
  addText(
    slide,
    "QQQ가 최고 수익을 냈다는 사실만으로는 투자 결정을 설명할 수 없다. 집중도를 낮출 때 포기한 수익, 줄어든 변동성, 실제 고점 대비 손실(MDD)을 함께 계산해야 분산의 가치가 보인다. 본 연구는 수동 전략과 최적화 결과를 같은 기준에 놓고 ‘수익 1등’과 ‘감내 가능한 선택’이 일치하는지 검토했다.",
    { left: 42, top: 231, width: 678, height: 85 },
    { fontSize: 16, color: C.ink, lineSpacing: 1.08 }
  );
  addText(
    slide,
    "분석 설계\nSPY · QQQ · TLT  |  2015.01.02–2024.12.30\n2,515거래일 · 연율화 252일 · 무위험수익률 3%\n공매도 없음 · 수동전략 3개 · Monte Carlo 10,000개\n지표  연율·누적수익률 / 변동성 / MDD / Sharpe",
    { left: 755, top: 229, width: 326, height: 89 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.06 }
  );

  // 01 Critical decision map
  addSectionHeading(slide, "01", "핵심 결과: ‘최소 변동성’은 ‘최소 손실’이 아니었다", 343);
  addText(
    slide,
    "누적수익률–최대낙폭 지도  |  왼쪽 위일수록 높은 수익과 작은 낙폭",
    { left: 42, top: 389, width: 698, height: 25 },
    { fontSize: 16, bold: true, color: C.muted }
  );
  slide.charts.add("scatter", {
    position: { left: 42, top: 418, width: 698, height: 327 },
    series: [
      {
        name: "Strategy A",
        xValues: [35.12],
        values: [441.24],
        fill: C.blue,
        marker: { symbol: "circle", size: 12 },
      },
      {
        name: "Strategy B",
        xValues: [30.86],
        values: [333.37],
        fill: C.orange,
        marker: { symbol: "circle", size: 12 },
      },
      {
        name: "Strategy C",
        xValues: [27.24],
        values: [115.32],
        fill: C.green,
        marker: { symbol: "circle", size: 12 },
      },
      {
        name: "Max Sharpe",
        xValues: [35.07],
        values: [434.05],
        fill: C.red,
        marker: { symbol: "diamond", size: 10 },
      },
      {
        name: "Min Volatility",
        xValues: [29.20],
        values: [75.64],
        fill: C.purple,
        marker: { symbol: "diamond", size: 11 },
      },
    ],
    scatterOptions: { style: "marker", varyColors: true },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 10 } },
    xAxis: {
      min: 25,
      max: 37,
      majorUnit: 2,
      textStyle: { fill: C.muted, fontSize: 10 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    yAxis: {
      min: 50,
      max: 470,
      majorUnit: 100,
      textStyle: { fill: C.muted, fontSize: 10 },
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
    "최대낙폭의 절대값 (%) →",
    { left: 278, top: 723, width: 230, height: 17 },
    { fontSize: 10, color: C.muted, alignment: "center" }
  );
  addText(
    slide,
    "A / Max Sharpe\n높은 수익, 약 35% 낙폭",
    { left: 573, top: 451, width: 145, height: 34 },
    { fontSize: 11, bold: true, color: C.red, alignment: "center" }
  );
  addText(
    slide,
    "B\n333.37% · MDD −30.86%",
    { left: 380, top: 526, width: 158, height: 32 },
    { fontSize: 11, bold: true, color: C.orange, alignment: "center" }
  );
  addText(
    slide,
    "C\n115.32% · MDD −27.24%",
    { left: 167, top: 646, width: 162, height: 32 },
    { fontSize: 11, bold: true, color: C.green, alignment: "center" }
  );
  addText(
    slide,
    "Min Vol.\n75.64% · MDD −29.20%",
    { left: 278, top: 681, width: 160, height: 31 },
    { fontSize: 11, bold: true, color: C.purple, alignment: "center" }
  );

  addPanel(slide, { left: 766, top: 389, width: 315, height: 356 }, C.white);
  addSubheading(slide, "그래프가 말하는 핵심", 784, 407, 279);
  addText(
    slide,
    "1  C는 Min Volatility보다 변동성이 0.76%p 높다. 하지만 누적수익률은 39.68%p 높고 MDD는 1.96%p 얕았다.\n\n2  즉 ‘일별 흔들림’을 가장 작게 만든 포트폴리오가 ‘실제 최대 손실’까지 가장 작게 만들지는 않았다.\n\n3  A와 Max Sharpe는 거의 같은 위치에 겹친다. 최적화는 새로운 분산 해법보다 분석 기간의 승자였던 QQQ 집중을 재현했다.\n\n4  왼쪽 위의 완벽한 전략은 없었다. 선택은 최고점이 아니라 수익과 손실 사이의 교환조건을 정하는 문제다.",
    { left: 784, top: 447, width: 279, height: 230 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.07 }
  );
  addRect(slide, { left: 784, top: 687, width: 279, height: 42 }, C.orangeSoft);
  addText(
    slide,
    "차별적 결론\n변동성 최소화 ≠ 손실 최소화",
    { left: 797, top: 695, width: 253, height: 29 },
    { fontSize: 15, bold: true, color: C.navy, alignment: "center" }
  );

  // 02 Cost of diversification
  addSectionHeading(slide, "02", "Strategy B는 분산의 효과를 ‘얼마를 지불하고 무엇을 얻었는가’로 보여준다", 775);
  addPanel(slide, { left: 42, top: 823, width: 539, height: 289 }, C.white);
  addText(
    slide,
    "QQQ 비중  100% → 50%",
    { left: 63, top: 841, width: 497, height: 31 },
    { fontSize: 23, bold: true, color: C.navy, alignment: "center" }
  );
  addText(
    slide,
    "Strategy A에서 B로 바꿨을 때 변화의 크기 (%p)",
    { left: 63, top: 878, width: 497, height: 22 },
    { fontSize: 14, bold: true, color: C.muted, alignment: "center" }
  );
  slide.charts.add("bar", {
    position: { left: 63, top: 902, width: 497, height: 174 },
    categories: ["수익 비용", "변동성 감소", "MDD 개선"],
    series: [{
      name: "변화폭",
      values: [2.73, 2.45, 4.26],
      fill: C.orange,
      valuesFormatCode: "0.00",
      points: [
        { idx: 0, fill: C.orange },
        { idx: 1, fill: C.teal },
        { idx: 2, fill: C.teal },
      ],
    }],
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 45, varyColors: true },
    hasLegend: false,
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 12 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 5,
      majorUnit: 1,
      textStyle: { fill: C.muted, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: C.ink, fontSize: 11, bold: true },
    },
    chartFill: C.white,
    chartLine: { style: "solid", fill: C.light, width: 1 },
    plotAreaFill: C.white,
    plotAreaLine: { style: "solid", fill: "none", width: 0 },
  });
  addText(
    slide,
    "주황 = 포기한 수익  |  청록 = 줄인 위험",
    { left: 63, top: 1082, width: 497, height: 18 },
    { fontSize: 11, color: C.muted, alignment: "center" }
  );

  addPanel(slide, { left: 606, top: 823, width: 475, height: 289 }, C.tealSoft, C.teal);
  addSubheading(slide, "왜 B가 프로젝트의 핵심 절충안인가", 625, 842, 437);
  addText(
    slide,
    "A → B의 가격\n연율수익률 19.32% → 16.59%  |  −2.73%p\nSharpe 0.75 → 0.70  |  −0.05\n\nA → B에서 얻은 것\n변동성 21.82% → 19.37%  |  −2.45%p\nMDD −35.12% → −30.86%  |  4.26%p 개선\n\nB는 수동 전략 중 유일하게 연율수익률 15% 이상을 유지하면서 A보다 변동성과 MDD를 모두 낮췄다. 최고 수익 전략은 아니지만, 집중 위험을 절반으로 줄이는 데 필요한 비용을 가장 명확하게 보여주는 전략이다.",
    { left: 625, top: 884, width: 437, height: 177 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.08 }
  );
  addRule(slide, 625, 1071, 437, C.teal, 2);
  addText(
    slide,
    "해석  분산은 공짜가 아니다. 중요한 것은 수익 감소 자체가 아니라, 그 비용으로 줄인 손실이 투자자의 감내 범위에 맞는가이다.",
    { left: 625, top: 1080, width: 437, height: 24 },
    { fontSize: 12, bold: true, color: C.navy }
  );

  // 03 Optimization
  addSectionHeading(slide, "03", "최적화가 정답을 만든 것이 아니라, 과거의 승자를 다시 선택했다", 1141);
  addText(
    slide,
    "최적 포트폴리오의 자산 비중",
    { left: 42, top: 1187, width: 446, height: 24 },
    { fontSize: 16, bold: true, color: C.muted }
  );
  slide.charts.add("bar", {
    position: { left: 42, top: 1215, width: 446, height: 204 },
    categories: ["Max Sharpe", "Min Volatility"],
    series: [
      { name: "SPY", values: [0.0007, 0.4450], fill: C.blue },
      { name: "QQQ", values: [0.9900, 0.0014], fill: C.orange },
      { name: "TLT", values: [0.0093, 0.5535], fill: C.green },
    ],
    barOptions: { direction: "column", grouping: "stacked", gapWidth: 42 },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 11 } },
    xAxis: {
      textStyle: { fill: C.ink, fontSize: 11 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 1,
      majorUnit: 0.25,
      textStyle: { fill: C.muted, fontSize: 9 },
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
    "QQQ 99.00%",
    { left: 106, top: 1310, width: 150, height: 23 },
    { fontSize: 14, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "TLT 55.35%",
    { left: 304, top: 1264, width: 142, height: 23 },
    { fontSize: 12, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "SPY 44.50%",
    { left: 304, top: 1342, width: 142, height: 23 },
    { fontSize: 12, bold: true, color: C.white, alignment: "center" }
  );

  addPanel(slide, { left: 515, top: 1187, width: 566, height: 232 }, C.white);
  addSubheading(slide, "최적화 결과를 읽는 방법", 534, 1205, 528);
  addText(
    slide,
    "Max Sharpe는 QQQ 99.00%로 수렴했고, 연율수익률 19.14%, 변동성 21.60%, MDD −35.07%, Sharpe 0.75를 기록했다. Strategy A와 사실상 같은 결과다. 이는 최적화가 새로운 안전장치를 발견했다기보다 2015–2024년의 강한 QQQ 성과를 다시 선택했다는 뜻이다.\n\nMin Volatility는 SPY 44.50%와 TLT 55.35%를 선택해 변동성을 10.29%로 낮췄다. 그러나 MDD는 −29.20%로 Strategy C보다 깊었고 누적수익률도 75.64%로 낮았다.\n\n따라서 ‘최적’이라는 이름보다 먼저 무엇을 최적화했는지 확인해야 한다. 변동성만 최소화하면 MDD와 장기성과는 별도의 문제로 남는다.",
    { left: 534, top: 1245, width: 528, height: 155 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.06 }
  );

  addRect(slide, { left: 42, top: 1432, width: 1039, height: 111 }, C.navy, "conclusion-band");
  addText(
    slide,
    "프로젝트의 결론",
    { left: 60, top: 1449, width: 180, height: 28 },
    { fontSize: 20, bold: true, color: C.orange }
  );
  addText(
    slide,
    "우리의 결론은 ‘QQQ가 좋다’ 또는 ‘분산하면 안전하다’가 아니다. 분산의 가치는 포기한 수익과 실제 낙폭 개선량을 함께 계산할 때만 판단할 수 있고, 최적화 결과는 선택한 위험지표와 분석 기간에 따라 달라진다.",
    { left: 60, top: 1481, width: 633, height: 47 },
    { fontSize: 16, bold: true, color: C.white, lineSpacing: 1.04 }
  );
  addRule(slide, 719, 1449, 2, "#486581", 73);
  addText(
    slide,
    "실행 가능한 해석\n• 성장 노출을 유지하며 집중을 낮추려면 Strategy B\n• 낮은 변동성보다 실제 낙폭을 우선하면 Strategy C\n• Max Sharpe의 QQQ 99%는 기간 특화 결과로 해석",
    { left: 742, top: 1448, width: 339, height: 79 },
    { fontSize: 13, color: "#D9E2EC", lineSpacing: 1.06 }
  );

  addText(
    slide,
    "한계: 동일 기간 최적화·평가, 비용·세금 미반영, 매일 재조정, 3개 ETF·무위험수익률 3% 고정  |  후속: 롤링·표본외 검증, 거래비용·재조정 주기 반영",
    { left: 42, top: 1553, width: 1039, height: 16 },
    { fontSize: 9, color: C.muted, alignment: "center" }
  );
  addText(
    slide,
    "자료: Yahoo Finance via yfinance  |  분석: Python · pandas · NumPy  |  분석 기간: 2015.01.02–2024.12.30",
    { left: 42, top: 1573, width: 1039, height: 10 },
    { fontSize: 8, color: C.muted, alignment: "center" }
  );

  slide.speakerNotes.textFrame.setText(sourceNotes);
  slide.speakerNotes.setVisible(true);

  const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
  await writeBlob(PREVIEW_PNG, preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(TMP, "poster-v3-layout.json"), await layout.text());
  const snapshot = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 26000,
  });
  await fs.writeFile(path.join(TMP, "poster-v3-inspect.ndjson"), snapshot.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
