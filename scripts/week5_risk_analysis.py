from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "etf_price.csv"
OUTPUT_DIR = ROOT_DIR / "outputs" / "week5"
ASSETS = ["QQQ", "SPY", "TLT"]
TRADING_DAYS = 252


def load_price_data() -> pd.DataFrame:
    price = pd.read_csv(DATA_PATH, index_col="Date", parse_dates=True)
    missing_assets = [asset_name for asset_name in ASSETS if asset_name not in price.columns]
    if missing_assets:
        raise ValueError(f"Missing assets in {DATA_PATH}: {missing_assets}")

    price = price[ASSETS].sort_index()
    if price.isna().any().any():
        missing_counts = price.isna().sum().to_dict()
        raise ValueError(f"Missing price values found: {missing_counts}")

    return price


def calculate_risk_metrics(
    price: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    returns = price.pct_change().dropna()
    cumulative = (1 + returns).cumprod()
    cumulative = pd.concat(
        [
            pd.DataFrame([[1.0] * len(ASSETS)], index=[price.index[0]], columns=ASSETS),
            cumulative,
        ]
    ).sort_index()
    rolling_max = cumulative.cummax()
    drawdown = cumulative / rolling_max - 1
    rolling_volatility = returns.rolling(TRADING_DAYS).std() * (TRADING_DAYS**0.5)

    summary = pd.DataFrame(
        {
            "daily_volatility_%": returns.std() * 100,
            "annualized_volatility_%": returns.std() * (TRADING_DAYS**0.5) * 100,
            "max_drawdown_%": drawdown.min() * 100,
            "avg_drawdown_%": drawdown.where(drawdown < 0).mean() * 100,
            "worst_drawdown_date": drawdown.idxmin().dt.strftime("%Y-%m-%d"),
            "positive_day_ratio_%": (returns > 0).mean() * 100,
        }
    ).loc[ASSETS]

    numeric_columns = summary.select_dtypes("number").columns
    summary[numeric_columns] = summary[numeric_columns].round(2)
    return returns, cumulative, drawdown, rolling_volatility, summary


def save_annualized_volatility_bar(summary: pd.DataFrame) -> None:
    ordered_summary = summary.sort_values("annualized_volatility_%", ascending=False)
    volatility_values = ordered_summary["annualized_volatility_%"]
    bar_colors = ["#E45756", "#F58518", "#4C78A8"]

    figure, axis = plt.subplots(figsize=(9, 5))
    bars = axis.bar(volatility_values.index, volatility_values, color=bar_colors)

    for bar_shape, volatility_value in zip(bars, volatility_values):
        axis.text(
            bar_shape.get_x() + bar_shape.get_width() / 2,
            volatility_value + 0.5,
            f"{volatility_value:.1f}%",
            ha="center",
            va="bottom",
            fontsize=11,
        )

    axis.set_title("Week 5: Annualized Volatility", fontsize=16)
    axis.set_xlabel("Asset")
    axis.set_ylabel("Annualized volatility (%)")
    axis.set_ylim(0, max(25, volatility_values.max() + 4))
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "annualized_volatility_bar.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_max_drawdown_chart(drawdown: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for asset_name in ASSETS:
        axis.plot(drawdown.index, drawdown[asset_name] * 100, linewidth=2, label=asset_name)

    axis.axhline(0, color="black", linewidth=1)
    axis.set_title("Week 5: Drawdown Over Time", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Drawdown (%)")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "max_drawdown_chart.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_rolling_volatility_chart(rolling_volatility: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for asset_name in ASSETS:
        axis.plot(
            rolling_volatility.index,
            rolling_volatility[asset_name] * 100,
            linewidth=2,
            label=asset_name,
        )

    axis.set_title("Week 5: 252-Day Rolling Volatility", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Annualized volatility (%)")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "rolling_volatility_chart.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_risk_summary_table(summary: pd.DataFrame) -> pd.DataFrame:
    metric_labels = {
        "daily_volatility_%": "Daily volatility (%)",
        "annualized_volatility_%": "Annualized volatility (%)",
        "max_drawdown_%": "Max drawdown (%)",
        "avg_drawdown_%": "Average drawdown (%)",
        "worst_drawdown_date": "Worst drawdown date",
        "positive_day_ratio_%": "Positive day ratio (%)",
    }

    summary_table = summary.T.rename(index=metric_labels)
    figure, axis = plt.subplots(figsize=(12, 4.8))
    axis.axis("off")
    axis.set_title("Week 5: Risk Summary Table", fontsize=16, pad=16)

    cell_text = []
    for _, row_values in summary_table.iterrows():
        formatted_row = []
        for value in row_values:
            if isinstance(value, str):
                formatted_row.append(value)
            else:
                formatted_row.append(f"{value:.2f}")
        cell_text.append(formatted_row)

    table = axis.table(
        cellText=cell_text,
        rowLabels=summary_table.index,
        colLabels=summary_table.columns,
        cellLoc="center",
        rowLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10.5)
    table.scale(1, 1.45)

    for (row_number, column_number), cell in table.get_celld().items():
        if row_number == 0 or column_number == -1:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "risk_summary_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return summary_table


def save_mdd_bar(summary: pd.DataFrame) -> None:
    drawdown_values = summary["max_drawdown_%"].sort_values()
    bar_colors = ["#E45756", "#F58518", "#4C78A8"]

    figure, axis = plt.subplots(figsize=(9, 5))
    bars = axis.bar(drawdown_values.index, drawdown_values, color=bar_colors)

    for bar_shape, drawdown_value in zip(bars, drawdown_values):
        axis.text(
            bar_shape.get_x() + bar_shape.get_width() / 2,
            drawdown_value - 1.0,
            f"{drawdown_value:.1f}%",
            ha="center",
            va="top",
            fontsize=11,
        )

    axis.axhline(0, color="black", linewidth=1)
    axis.set_title("Week 5: Maximum Drawdown", fontsize=16)
    axis.set_xlabel("Asset")
    axis.set_ylabel("Max drawdown (%)")
    axis.set_ylim(min(-55, drawdown_values.min() - 5), 5)
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "max_drawdown_bar.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def dataframe_to_markdown_table(dataframe: pd.DataFrame) -> str:
    headers = ["Metric", *dataframe.columns.tolist()]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]

    for metric_name, row_values in dataframe.iterrows():
        formatted_values = []
        for value in row_values:
            if isinstance(value, str):
                formatted_values.append(value)
            else:
                formatted_values.append(f"{value:.2f}")
        lines.append("| " + " | ".join([str(metric_name), *formatted_values]) + " |")

    return "\n".join(lines)


def write_analysis_markdown(price: pd.DataFrame, summary: pd.DataFrame, summary_table: pd.DataFrame) -> None:
    qqq_summary = summary.loc["QQQ"]
    spy_summary = summary.loc["SPY"]
    tlt_summary = summary.loc["TLT"]
    deepest_drawdown_asset = summary["max_drawdown_%"].astype(float).idxmin()

    analysis_markdown = f"""# Week 5 — 리스크 분석

## 주요 결과물 이미지

![Annualized volatility](annualized_volatility_bar.png)

![Drawdown over time](max_drawdown_chart.png)

![Maximum drawdown](max_drawdown_bar.png)

![Rolling volatility](rolling_volatility_chart.png)

![Risk summary table](risk_summary_table.png)

## 리스크 요약표

{dataframe_to_markdown_table(summary_table)}

## 분석 내용

이번 5주차 분석은 {price.index.min().date()}부터 {price.index.max().date()}까지의 QQQ, SPY, TLT 일별 수익률을 이용해 변동성, 최대 낙폭, 롤링 변동성을 계산했다. 변동성은 일별 수익률의 표준편차를 연율화해 비교했고, 최대 낙폭은 누적 수익률이 직전 고점 대비 얼마나 크게 하락했는지를 측정했다. 따라서 이번 분석은 4주차의 단순 수익률 순위가 실제로 얼마나 큰 위험을 동반했는지 확인하는 단계다.

연율화 변동성은 QQQ가 {qqq_summary["annualized_volatility_%"]:.2f}%로 가장 높고, SPY는 {spy_summary["annualized_volatility_%"]:.2f}%, TLT는 {tlt_summary["annualized_volatility_%"]:.2f}%를 기록했다. 4주차에서 QQQ가 가장 높은 누적 수익률을 보였지만, 동시에 가격 흔들림도 가장 컸다. 이는 성장형 기술주 중심 ETF의 고수익이 높은 변동성을 감수한 결과라는 점을 보여준다. SPY는 QQQ보다 낮은 수익률을 냈지만 변동성도 낮아, 시장 전체에 분산된 자산의 안정성이 일부 확인된다.

최대 낙폭 기준으로는 {deepest_drawdown_asset}의 손실 구간이 가장 깊었다. QQQ의 최대 낙폭은 {qqq_summary["max_drawdown_%"]:.2f}%, SPY는 {spy_summary["max_drawdown_%"]:.2f}%, TLT는 {tlt_summary["max_drawdown_%"]:.2f}%다. 특히 TLT는 주식 ETF보다 장기 수익률이 낮았음에도 최대 낙폭이 작지 않았기 때문에, 채권 ETF가 모든 기간에서 자동으로 안전자산 역할을 한다고 보기는 어렵다. 2022년 금리 상승 국면처럼 채권 가격에 불리한 환경에서는 TLT도 의미 있는 손실을 기록할 수 있다.

롤링 변동성 차트에서는 시장 충격 시기에 세 자산의 위험이 동시에 상승하는 모습을 확인할 수 있다. 특히 2020년 코로나19 충격과 2022년 금리 상승 구간에서 변동성이 커졌고, 이 시기에는 단순히 자산을 나누어 보유하는 것만으로 리스크가 완전히 사라지지 않는다. 5주차 결론은 QQQ가 가장 높은 수익률과 가장 높은 위험을 동시에 가진 자산이며, SPY는 상대적으로 중간 수준의 위험·수익 특성을 보이고, TLT는 분산 효과 후보이지만 금리 환경에 따라 별도 리스크를 가진다는 것이다. 6주차에서는 이 특성을 바탕으로 QQQ 단일, 주식 혼합, 주식+채권 전략을 구성해 포트폴리오 단위의 성과를 비교한다.
"""
    (OUTPUT_DIR / "week5_analysis.md").write_text(analysis_markdown, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    price = load_price_data()
    returns, cumulative, drawdown, rolling_volatility, summary = calculate_risk_metrics(price)

    returns.to_csv(OUTPUT_DIR / "week5_returns.csv")
    cumulative.to_csv(OUTPUT_DIR / "week5_cumulative_returns.csv")
    drawdown.to_csv(OUTPUT_DIR / "week5_drawdown.csv")
    rolling_volatility.to_csv(OUTPUT_DIR / "week5_rolling_volatility.csv")
    summary.to_csv(OUTPUT_DIR / "week5_risk_summary.csv")

    save_annualized_volatility_bar(summary)
    save_max_drawdown_chart(drawdown)
    save_mdd_bar(summary)
    save_rolling_volatility_chart(rolling_volatility)
    summary_table = save_risk_summary_table(summary)
    write_analysis_markdown(price, summary, summary_table)

    print(f"Saved Week 5 outputs to {OUTPUT_DIR}")
    print(summary.to_string())


if __name__ == "__main__":
    main()
