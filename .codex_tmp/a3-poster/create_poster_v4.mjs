import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:\\Users\\Insun\\Last-break-of-Honeybadger";
const TMP = path.join(ROOT, ".codex_tmp", "a3-poster");
const OUT = path.join(ROOT, "outputs", "poster");
const FINAL_PPTX = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v4.pptx");
const PREVIEW_PNG = path.join(OUT, "Last_Break_of_Honeybadger_A3_Portrait_v4_preview.png");

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

function addSectionHeading(slide, index, label, title, top) {
  addRule(slide, 42, top + 3, 7, C.orange, 31);
  addText(
    slide,
    `${index}. ${label}`,
    { left: 60, top, width: 155, height: 37 },
    { fontSize: 24, bold: true, color: C.orange }
  );
  addText(
    slide,
    title,
    { left: 210, top, width: 871, height: 38 },
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

  // 01 Problem
  addSectionHeading(slide, "01", "문제 제기", "수익률 1등만으로는 투자 전략을 결정할 수 없다", 165);
  addText(
    slide,
    "2015–2024년 QQQ의 누적수익률은 441.24%, 연율수익률은 19.32%였다. 수익률만 보면 QQQ 100%인 Strategy A가 자연스러운 답이다. 그러나 같은 전략의 변동성은 21.82%, 최대낙폭(MDD)은 −35.12%였다. 투자자는 평균수익률이 아니라 실제 하락 구간도 견뎌야 하므로, 높은 수익이 집중 위험을 충분히 보상했는지를 따로 확인해야 한다.",
    { left: 42, top: 213, width: 679, height: 90 },
    { fontSize: 16, color: C.ink, lineSpacing: 1.08 }
  );
  addPanel(slide, { left: 752, top: 210, width: 329, height: 102 }, C.orangeSoft, C.orange);
  addText(
    slide,
    "그래서 세 가지를 물었다\n1  분산은 실제 MDD를 줄였는가?\n2  그 대가로 수익을 얼마나 포기했는가?\n3  최적화는 더 나은 답을 만들었는가?",
    { left: 770, top: 226, width: 293, height: 72 },
    { fontSize: 15, bold: true, color: C.navy, lineSpacing: 1.08 }
  );

  // 02 Method
  addSectionHeading(slide, "02", "방법론", "수동 전략과 최적화를 동일한 데이터·동일한 지표로 비교했다", 335);
  addRule(slide, 381, 386, 1, C.light, 135);
  addRule(slide, 748, 386, 1, C.light, 135);
  addText(
    slide,
    "1  데이터",
    { left: 42, top: 386, width: 310, height: 25 },
    { fontSize: 18, bold: true, color: C.blue }
  );
  addText(
    slide,
    "SPY · QQQ · TLT\n2015.01.02–2024.12.30, 2,515거래일\n일별 수익률을 계산해 252일 기준으로 연율화",
    { left: 42, top: 420, width: 310, height: 78 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.06 }
  );
  addText(
    slide,
    "2  비교 대상",
    { left: 407, top: 386, width: 310, height: 25 },
    { fontSize: 18, bold: true, color: C.orange }
  );
  addText(
    slide,
    "A  QQQ 100%\nB  SPY 50% + QQQ 50%\nC  SPY 60% + TLT 40%\n공매도 없이 포트폴리오 10,000개 추가 시뮬레이션",
    { left: 407, top: 420, width: 310, height: 88 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.04 }
  );
  addText(
    slide,
    "3  판단 기준",
    { left: 775, top: 386, width: 306, height: 25 },
    { fontSize: 18, bold: true, color: C.teal }
  );
  addText(
    slide,
    "연율·누적수익률  수익의 크기\n변동성  일별 흔들림\nMDD  고점 대비 실제 최대 손실\nSharpe  위험 1단위당 초과수익(무위험 3%)",
    { left: 775, top: 420, width: 306, height: 88 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.04 }
  );
  addRect(slide, { left: 42, top: 529, width: 1039, height: 39 }, C.tealSoft);
  addText(
    slide,
    "분석 순서  전체 전략의 수익–낙폭 위치 확인 → A에서 B로 바꿀 때의 비용 계산 → 최적화 결과가 새로운 해법인지 검증",
    { left: 60, top: 539, width: 1003, height: 21 },
    { fontSize: 14, bold: true, color: C.navy, alignment: "center" }
  );

  // 03 Result 1
  addSectionHeading(slide, "03", "결과 1", "먼저 모든 전략을 수익과 실제 낙폭의 지도에 배치했다", 594);
  addText(
    slide,
    "누적수익률–최대낙폭 지도  |  왼쪽 위일수록 높은 수익과 작은 낙폭",
    { left: 42, top: 640, width: 608, height: 22 },
    { fontSize: 14, bold: true, color: C.muted }
  );
  slide.charts.add("scatter", {
    position: { left: 42, top: 666, width: 608, height: 266 },
    series: [
      {
        name: "Strategy A",
        xValues: [35.12],
        values: [441.24],
        fill: C.blue,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Strategy B",
        xValues: [30.86],
        values: [333.37],
        fill: C.orange,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Strategy C",
        xValues: [27.24],
        values: [115.32],
        fill: C.green,
        marker: { symbol: "circle", size: 11 },
      },
      {
        name: "Max Sharpe",
        xValues: [35.07],
        values: [434.05],
        fill: C.red,
        marker: { symbol: "diamond", size: 9 },
      },
      {
        name: "Min Volatility",
        xValues: [29.20],
        values: [75.64],
        fill: C.purple,
        marker: { symbol: "diamond", size: 10 },
      },
    ],
    scatterOptions: { style: "marker", varyColors: true },
    hasLegend: true,
    legend: { position: "top", overlay: false, textStyle: { fill: C.muted, fontSize: 9 } },
    xAxis: {
      min: 25,
      max: 37,
      majorUnit: 2,
      textStyle: { fill: C.muted, fontSize: 9 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: { style: "solid", fill: C.grid, width: 1 },
      numberFormatCode: "0",
    },
    yAxis: {
      min: 50,
      max: 470,
      majorUnit: 100,
      textStyle: { fill: C.muted, fontSize: 9 },
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
    "A / Max Sharpe",
    { left: 516, top: 697, width: 112, height: 20 },
    { fontSize: 10, bold: true, color: C.red, alignment: "center" }
  );
  addText(
    slide,
    "B",
    { left: 353, top: 755, width: 42, height: 18 },
    { fontSize: 11, bold: true, color: C.orange, alignment: "center" }
  );
  addText(
    slide,
    "C",
    { left: 151, top: 853, width: 42, height: 18 },
    { fontSize: 11, bold: true, color: C.green, alignment: "center" }
  );
  addText(
    slide,
    "Min Vol.",
    { left: 245, top: 881, width: 75, height: 18 },
    { fontSize: 10, bold: true, color: C.purple, alignment: "center" }
  );

  addPanel(slide, { left: 680, top: 640, width: 401, height: 292 }, C.white);
  addSubheading(slide, "첫 번째 발견", 699, 658, 363);
  addText(
    slide,
    "완벽한 왼쪽 위 전략은 없었다. A와 Max Sharpe는 높은 수익을 기록했지만 MDD가 약 −35%였고, B는 수익과 낙폭의 중간에 위치했다.\n\n가장 중요한 비교는 C와 Min Volatility다. C는 변동성이 0.76%p 높았지만 누적수익률은 39.68%p 높고 MDD는 1.96%p 얕았다. ‘일별 흔들림’을 최소화한 전략이 ‘실제 최대 손실’까지 최소화한 것은 아니었다.\n\n따라서 변동성과 MDD를 분리해 봐야 한다. 이 결과를 바탕으로, 다음 단계에서는 현실적 중간안인 B의 비용과 편익을 계산했다.",
    { left: 699, top: 697, width: 363, height: 184 },
    { fontSize: 15, color: C.ink, lineSpacing: 1.07 }
  );
  addRect(slide, { left: 699, top: 888, width: 363, height: 29 }, C.orangeSoft);
  addText(
    slide,
    "핵심  변동성 최소화 ≠ 손실 최소화",
    { left: 709, top: 895, width: 343, height: 17 },
    { fontSize: 13, bold: true, color: C.navy, alignment: "center" }
  );

  // 04 Result 2
  addSectionHeading(slide, "04", "결과 2", "그다음 Strategy B가 무엇을 포기하고 무엇을 얻었는지 계산했다", 956);
  addPanel(slide, { left: 42, top: 1004, width: 435, height: 213 }, C.white);
  addText(
    slide,
    "QQQ 비중  100% → 50%",
    { left: 60, top: 1020, width: 399, height: 27 },
    { fontSize: 21, bold: true, color: C.navy, alignment: "center" }
  );
  slide.charts.add("bar", {
    position: { left: 60, top: 1054, width: 399, height: 128 },
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
      textStyle: { fill: C.ink, fontSize: 10 },
      line: { style: "solid", fill: C.grid, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 0,
      max: 5,
      majorUnit: 1,
      textStyle: { fill: C.muted, fontSize: 8 },
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
  addText(
    slide,
    "주황 = 포기한 수익  |  청록 = 줄인 위험  |  단위: %p",
    { left: 60, top: 1188, width: 399, height: 15 },
    { fontSize: 9, color: C.muted, alignment: "center" }
  );

  addText(
    slide,
    "먼저 비용을 계산했다.\n연율수익률  19.32%→16.59%  (−2.73%p)\n누적수익률  441.24%→333.37%  (−107.87%p)\n\n다음으로 편익을 계산했다.\n변동성  21.82%→19.37%  (−2.45%p)\nMDD  −35.12%→−30.86%  (4.26%p 개선)\nSharpe  0.75→0.70  (−0.05)\n\nB는 수동 전략 중 유일하게 연율수익률 15% 이상을 유지하면서 A보다 변동성과 MDD를 모두 낮췄다. 공짜로 안전해진 전략은 아니지만, 성장 노출을 유지하기 위해 지불한 비용이 명확한 절충안이다. 다음으로 최적화가 더 나은 절충안을 제시했는지 확인했다.",
    { left: 512, top: 1008, width: 569, height: 196 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.07 }
  );

  // 05 Result 3
  addSectionHeading(slide, "05", "결과 3", "마지막으로 최적화가 새로운 분산 해법을 제시했는지 검증했다", 1240);
  slide.charts.add("bar", {
    position: { left: 42, top: 1288, width: 361, height: 150 },
    categories: ["Max Sharpe", "Min Volatility"],
    series: [
      { name: "SPY", values: [0.0007, 0.4450], fill: C.blue },
      { name: "QQQ", values: [0.9900, 0.0014], fill: C.orange },
      { name: "TLT", values: [0.0093, 0.5535], fill: C.green },
    ],
    barOptions: { direction: "column", grouping: "stacked", gapWidth: 42 },
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
    "QQQ 99.00%",
    { left: 83, top: 1357, width: 130, height: 20 },
    { fontSize: 12, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "TLT 55.35%",
    { left: 236, top: 1328, width: 126, height: 20 },
    { fontSize: 10, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "SPY 44.50%",
    { left: 236, top: 1382, width: 126, height: 20 },
    { fontSize: 10, bold: true, color: C.white, alignment: "center" }
  );
  addText(
    slide,
    "Max Sharpe는 QQQ 99.00%로 수렴해 Strategy A와 거의 같은 수익·위험을 기록했다. 새로운 분산 해법보다 2015–2024년의 승자였던 QQQ 집중을 다시 선택한 것이다.\n\nMin Volatility는 변동성을 10.29%로 낮췄지만 MDD는 −29.20%, 누적수익률은 75.64%였다. 결과 1에서 확인했듯 C가 실제 낙폭과 누적성과에서는 더 나았다.\n\n따라서 최적화는 설정한 지표만 푼다. 같은 기간으로 최적화와 평가를 수행한 in-sample 결과이므로, ‘최적’이라는 이름보다 어떤 위험을 어떤 기간에서 최적화했는지를 먼저 확인해야 한다.",
    { left: 438, top: 1290, width: 643, height: 143 },
    { fontSize: 14, color: C.ink, lineSpacing: 1.06 }
  );

  // Conclusion
  addRect(slide, { left: 0, top: 1460, width: W, height: 106 }, C.navy, "conclusion-band");
  addText(
    slide,
    "연구 질문에 대한 답",
    { left: 42, top: 1475, width: 190, height: 27 },
    { fontSize: 20, bold: true, color: C.orange }
  );
  addText(
    slide,
    "분산의 가치는 포기한 수익과 실제 낙폭 개선량을 함께 계산할 때 판단할 수 있다. 이 기준에서 B는 성장 노출과 위험 완화 사이의 현실적 절충안이고, C는 변동성 최소화보다 실제 손실을 우선할 때 더 설득력 있는 방어안이었다.",
    { left: 42, top: 1506, width: 656, height: 45 },
    { fontSize: 15, bold: true, color: C.white, lineSpacing: 1.04 }
  );
  addRule(slide, 722, 1476, 2, "#486581", 69);
  addText(
    slide,
    "최종 판단 원칙\n1  최고 수익률보다 감내 가능한 MDD를 먼저 정한다.\n2  변동성과 최대낙폭을 서로 다른 위험으로 본다.\n3  최적화 결과는 기간 밖 검증 후 사용한다.",
    { left: 745, top: 1474, width: 336, height: 75 },
    { fontSize: 13, color: "#D9E2EC", lineSpacing: 1.06 }
  );
  addText(
    slide,
    "한계: 동일 기간 최적화·평가, 비용·세금 미반영, 매일 재조정, 3개 ETF·무위험수익률 3% 고정  |  후속: 롤링·표본외 검증, 거래비용·재조정 주기 반영",
    { left: 42, top: 1568, width: 1039, height: 9 },
    { fontSize: 7, color: C.muted, alignment: "center" }
  );
  addText(
    slide,
    "자료: Yahoo Finance via yfinance  |  분석: Python · pandas · NumPy  |  분석 기간: 2015.01.02–2024.12.30",
    { left: 42, top: 1578, width: 1039, height: 8 },
    { fontSize: 6, color: C.muted, alignment: "center" }
  );

  slide.speakerNotes.textFrame.setText(sourceNotes);
  slide.speakerNotes.setVisible(true);

  const preview = await presentation.export({ slide, format: "png", scale: 1.5 });
  await writeBlob(PREVIEW_PNG, preview);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(TMP, "poster-v4-layout.json"), await layout.text());
  const snapshot = await presentation.inspect({
    kind: "slide,textbox,shape,image,table,chart,notes",
    maxChars: 28000,
  });
  await fs.writeFile(path.join(TMP, "poster-v4-inspect.ndjson"), snapshot.ndjson);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(FINAL_PPTX);
  console.log(FINAL_PPTX);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
