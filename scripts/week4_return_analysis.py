from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "etf_price.csv"
OUTPUT_DIR = ROOT_DIR / "outputs" / "week4"
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


def calculate_returns(price: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    returns = price.pct_change().dropna()
    cumulative = (1 + returns).cumprod()
    cumulative = pd.concat(
        [
            pd.DataFrame([[1.0] * len(ASSETS)], index=[price.index[0]], columns=ASSETS),
            cumulative,
        ]
    ).sort_index()

    summary = pd.DataFrame(
        {
            "daily_mean_%": returns.mean() * 100,
            "annualized_return_%": returns.mean() * TRADING_DAYS * 100,
            "daily_volatility_%": returns.std() * 100,
            "positive_day_ratio_%": (returns > 0).mean() * 100,
            "cumulative_return_%": (cumulative.iloc[-1] - 1) * 100,
            "best_daily_return_%": returns.max() * 100,
            "worst_daily_return_%": returns.min() * 100,
        }
    ).loc[ASSETS]

    summary = summary.mask(summary.abs() < 0.005, 0).round(2)
    return returns, cumulative, summary


def save_daily_return_distribution(returns: pd.DataFrame) -> None:
    figure, axes = plt.subplots(1, len(ASSETS), figsize=(18, 5), sharey=True)
    figure.suptitle("Week 4: Daily Return Distribution", fontsize=16)

    for asset_name, axis in zip(ASSETS, axes):
        return_percent = returns[asset_name] * 100
        mean_return = return_percent.mean()
        axis.hist(return_percent, bins=70, color="#4C78A8", alpha=0.75, edgecolor="white")
        axis.axvline(0, color="black", linestyle="--", linewidth=1)
        axis.axvline(
            mean_return,
            color="#F58518",
            linewidth=2,
            label=f"Mean {mean_return:.3f}%",
        )
        axis.set_title(f"{asset_name} Daily Return Distribution")
        axis.set_xlabel("Daily return (%)")
        axis.legend()

    axes[0].set_ylabel("Frequency")
    figure.tight_layout(rect=[0, 0, 1, 0.92])
    figure.savefig(OUTPUT_DIR / "daily_return_distribution.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_cumulative_return(cumulative: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for asset_name in ASSETS:
        final_return = (cumulative[asset_name].iloc[-1] - 1) * 100
        axis.plot(cumulative.index, cumulative[asset_name], linewidth=2, label=f"{asset_name} ({final_return:.1f}%)")

    axis.axhline(1, color="black", linestyle="--", linewidth=1)
    axis.set_title("Week 4: Cumulative Return (2015-2024)", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Growth of $1")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "cumulative_return.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_annualized_return_bar(summary: pd.DataFrame) -> None:
    ordered_summary = summary.sort_values("annualized_return_%", ascending=False)
    return_values = ordered_summary["annualized_return_%"]
    bar_colors = ["#54A24B" if return_value >= 0 else "#E45756" for return_value in return_values]

    figure, axis = plt.subplots(figsize=(9, 5))
    bars = axis.bar(return_values.index, return_values, color=bar_colors)

    for bar_shape, return_value in zip(bars, return_values):
        label_offset = 0.45 if return_value >= 0 else -0.75
        label_position = return_value + label_offset
        axis.text(
            bar_shape.get_x() + bar_shape.get_width() / 2,
            label_position,
            f"{return_value:.1f}%",
            ha="center",
            va="bottom" if return_value >= 0 else "top",
            fontsize=11,
        )

    axis.axhline(0, color="black", linewidth=1)
    axis.set_title("Week 4: Annualized Average Return", fontsize=16)
    axis.set_xlabel("Asset")
    axis.set_ylabel("Annualized return (%)")
    axis.set_ylim(min(-2, return_values.min() - 2), max(22, return_values.max() + 2))
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "annualized_return_bar.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_return_summary_table(summary: pd.DataFrame) -> pd.DataFrame:
    metric_labels = {
        "daily_mean_%": "Daily mean (%)",
        "annualized_return_%": "Annualized return (%)",
        "daily_volatility_%": "Daily volatility (%)",
        "positive_day_ratio_%": "Positive day ratio (%)",
        "cumulative_return_%": "Cumulative return (%)",
        "best_daily_return_%": "Best daily return (%)",
        "worst_daily_return_%": "Worst daily return (%)",
    }

    summary_table = summary.T.rename(index=metric_labels)
    figure, axis = plt.subplots(figsize=(12, 4.8))
    axis.axis("off")
    axis.set_title("Week 4: Return Summary Table (%)", fontsize=16, pad=16)

    table = axis.table(
        cellText=[[f"{value:.2f}" for value in row_values] for row_values in summary_table.to_numpy()],
        rowLabels=summary_table.index,
        colLabels=summary_table.columns,
        cellLoc="center",
        rowLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 1.45)

    for (row_number, column_number), cell in table.get_celld().items():
        if row_number == 0 or column_number == -1:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "return_summary_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return summary_table


def dataframe_to_markdown_table(dataframe: pd.DataFrame) -> str:
    headers = ["Metric", *dataframe.columns.tolist()]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]

    for metric_name, row_values in dataframe.iterrows():
        formatted_values = [f"{value:.2f}" for value in row_values]
        lines.append("| " + " | ".join([str(metric_name), *formatted_values]) + " |")

    return "\n".join(lines)


def write_analysis_markdown(price: pd.DataFrame, summary: pd.DataFrame, summary_table: pd.DataFrame) -> None:
    qqq_summary = summary.loc["QQQ"]
    spy_summary = summary.loc["SPY"]
    tlt_summary = summary.loc["TLT"]
    analysis_markdown = f"""# Week 4 — 수익률 분석

## 주요 결과물 이미지

![Daily return distribution](daily_return_distribution.png)

![Cumulative return](cumulative_return.png)

![Annualized return](annualized_return_bar.png)

![Return summary table](return_summary_table.png)

## 수익률 요약표

{dataframe_to_markdown_table(summary_table)}

## 분석 내용

이번 4주차 분석은 {price.index.min().date()}부터 {price.index.max().date()}까지의 QQQ, SPY, TLT 종가를 기준으로 일별 수익률과 누적 수익률을 계산했다. 일별 수익률은 전일 대비 가격 변화율로 정의했고, 연율화 수익률은 일평균 수익률에 연간 거래일 수 252일을 곱해 산출했다. 이 방식은 자산별 성과를 같은 시간 단위로 비교하기 위한 기준이며, 위험 조정 성과는 이후 주차의 변동성·MDD·Sharpe Ratio 분석에서 별도로 판단한다.

수익률 분포를 보면 세 ETF 모두 대부분의 일별 수익률이 0% 근처에 몰려 있지만, QQQ와 SPY는 좌우 꼬리가 더 길게 나타난다. QQQ의 일평균 수익률은 {qqq_summary["daily_mean_%"]:.2f}%로 가장 높고, SPY는 {spy_summary["daily_mean_%"]:.2f}%로 그 뒤를 따른다. TLT는 일평균 수익률이 {tlt_summary["daily_mean_%"]:.2f}%로 거의 0에 가까워, 분석 기간 전체에서 채권 ETF가 주식 ETF 대비 뚜렷한 성장 동력을 제공하지 못했다.

누적 수익률 기준으로는 QQQ가 {qqq_summary["cumulative_return_%"]:.2f}%로 가장 강한 성과를 보였고, SPY는 {spy_summary["cumulative_return_%"]:.2f}%를 기록했다. 같은 기간 TLT의 누적 수익률은 {tlt_summary["cumulative_return_%"]:.2f}%로 음수였기 때문에, 2015년 초에 1달러를 투자했다면 2024년 말 기준 원금보다 낮은 수준으로 끝난다. 특히 2022년 이후 금리 상승 구간에서 TLT가 약세를 보이면서 주식 ETF와의 성과 격차가 크게 확대된 것으로 해석된다.

연율화 평균 수익률도 같은 결론을 뒷받침한다. QQQ는 {qqq_summary["annualized_return_%"]:.2f}%로 가장 높고, SPY는 {spy_summary["annualized_return_%"]:.2f}%를 기록했다. TLT는 {tlt_summary["annualized_return_%"]:.2f}%로 사실상 수익 기여가 없었다. 다만 QQQ는 일별 변동성도 {qqq_summary["daily_volatility_%"]:.2f}%로 가장 높으므로, 단순 수익률만으로 최적 자산이라고 결론내리기는 어렵다. 5주차에서는 변동성, 최대 낙폭, 롤링 변동성을 계산해 이번 수익률 결과가 감수한 위험 대비 적절했는지 검증해야 한다.
"""
    (OUTPUT_DIR / "week4_analysis.md").write_text(analysis_markdown, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    price = load_price_data()
    returns, cumulative, summary = calculate_returns(price)

    returns.to_csv(OUTPUT_DIR / "week4_returns.csv")
    summary.to_csv(OUTPUT_DIR / "week4_return_summary.csv")

    save_daily_return_distribution(returns)
    save_cumulative_return(cumulative)
    save_annualized_return_bar(summary)
    summary_table = save_return_summary_table(summary)
    write_analysis_markdown(price, summary, summary_table)

    print(f"Saved Week 4 outputs to {OUTPUT_DIR}")
    print(summary.to_string())


if __name__ == "__main__":
    main()
