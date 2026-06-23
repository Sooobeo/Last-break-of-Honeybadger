from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "etf_price.csv"
OUTPUT_DIR = ROOT_DIR / "outputs" / "week6"
ASSETS = ["QQQ", "SPY", "TLT"]
TRADING_DAYS = 252
RISK_FREE_RATE = 0.03

STRATEGIES = {
    "Strategy A": {
        "name": "QQQ 단일",
        "display_name": "QQQ only",
        "weights": {"QQQ": 1.0, "SPY": 0.0, "TLT": 0.0},
    },
    "Strategy B": {
        "name": "주식 혼합",
        "display_name": "Equity mix",
        "weights": {"QQQ": 0.5, "SPY": 0.5, "TLT": 0.0},
    },
    "Strategy C": {
        "name": "주식+채권",
        "display_name": "Equity + bond",
        "weights": {"QQQ": 0.0, "SPY": 0.6, "TLT": 0.4},
    },
}


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


def calculate_portfolio_returns(asset_returns: pd.DataFrame) -> pd.DataFrame:
    portfolio_returns = pd.DataFrame(index=asset_returns.index)

    for strategy_name, strategy_config in STRATEGIES.items():
        weights = pd.Series(strategy_config["weights"])
        portfolio_returns[strategy_name] = (asset_returns[ASSETS] * weights[ASSETS]).sum(axis=1)

    return portfolio_returns


def calculate_cumulative_returns(portfolio_returns: pd.DataFrame, start_date: pd.Timestamp) -> pd.DataFrame:
    cumulative = (1 + portfolio_returns).cumprod()
    initial_row = pd.DataFrame(
        [[1.0] * len(cumulative.columns)],
        index=[start_date],
        columns=cumulative.columns,
    )
    return pd.concat([initial_row, cumulative]).sort_index()


def calculate_drawdown(cumulative: pd.DataFrame) -> pd.DataFrame:
    rolling_max = cumulative.cummax()
    return cumulative / rolling_max - 1


def calculate_summary(portfolio_returns: pd.DataFrame, cumulative: pd.DataFrame, drawdown: pd.DataFrame) -> pd.DataFrame:
    annualized_return = portfolio_returns.mean() * TRADING_DAYS
    annualized_volatility = portfolio_returns.std() * (TRADING_DAYS**0.5)
    sharpe_ratio = (annualized_return - RISK_FREE_RATE) / annualized_volatility

    summary = pd.DataFrame(
        {
            "strategy_name": [STRATEGIES[strategy_name]["name"] for strategy_name in portfolio_returns.columns],
            "annualized_return_%": annualized_return * 100,
            "annualized_volatility_%": annualized_volatility * 100,
            "max_drawdown_%": drawdown.min() * 100,
            "cumulative_return_%": (cumulative.iloc[-1] - 1) * 100,
            "sharpe_ratio": sharpe_ratio,
            "positive_day_ratio_%": (portfolio_returns > 0).mean() * 100,
        },
        index=portfolio_returns.columns,
    )

    numeric_columns = summary.select_dtypes("number").columns
    summary[numeric_columns] = summary[numeric_columns].round(2)
    return summary


def save_strategy_weight_table() -> pd.DataFrame:
    weights_table = pd.DataFrame(
        {
            strategy_name: {
                **strategy_config["weights"],
                "strategy_description": strategy_config["name"],
            }
            for strategy_name, strategy_config in STRATEGIES.items()
        }
    ).T[["strategy_description", *ASSETS]]

    weights_table.to_csv(OUTPUT_DIR / "week6_strategy_weights.csv")

    figure, axis = plt.subplots(figsize=(10, 3.5))
    axis.axis("off")
    axis.set_title("Week 6: Strategy Weights", fontsize=16, pad=16)

    display_table = weights_table.rename(columns={"strategy_description": "Strategy description"}).copy()
    display_table["Strategy description"] = [
        STRATEGIES[strategy_name]["display_name"] for strategy_name in display_table.index
    ]
    for asset_name in ASSETS:
        display_table[asset_name] = (display_table[asset_name].astype(float) * 100).map("{:.0f}%".format)

    table = axis.table(
        cellText=display_table.values,
        rowLabels=display_table.index,
        colLabels=display_table.columns,
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
    figure.savefig(OUTPUT_DIR / "strategy_weights_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return weights_table


def save_cumulative_return_chart(cumulative: pd.DataFrame, summary: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for strategy_name in cumulative.columns:
        final_return = summary.loc[strategy_name, "cumulative_return_%"]
        label = f"{strategy_name} ({final_return:.1f}%)"
        axis.plot(cumulative.index, cumulative[strategy_name], linewidth=2, label=label)

    axis.axhline(1, color="black", linestyle="--", linewidth=1)
    axis.set_title("Week 6: Strategy Cumulative Return", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Growth of $1")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "strategy_cumulative_return.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_risk_return_scatter(summary: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(8, 6))
    colors = ["#4C78A8", "#F58518", "#54A24B"]

    for color, (strategy_name, row_values) in zip(colors, summary.iterrows()):
        axis.scatter(
            row_values["annualized_volatility_%"],
            row_values["annualized_return_%"],
            s=180,
            color=color,
            edgecolor="black",
            label=f"{strategy_name}: Sharpe {row_values['sharpe_ratio']:.2f}",
        )
        axis.annotate(
            strategy_name,
            (row_values["annualized_volatility_%"], row_values["annualized_return_%"]),
            xytext=(8, 8),
            textcoords="offset points",
            fontsize=11,
        )

    axis.set_title("Week 6: Risk-Return Comparison", fontsize=16)
    axis.set_xlabel("Annualized volatility (%)")
    axis.set_ylabel("Annualized return (%)")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "strategy_risk_return_scatter.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_sharpe_ratio_bar(summary: pd.DataFrame) -> None:
    ordered_summary = summary.sort_values("sharpe_ratio", ascending=False)
    sharpe_values = ordered_summary["sharpe_ratio"]

    figure, axis = plt.subplots(figsize=(9, 5))
    bars = axis.bar(sharpe_values.index, sharpe_values, color=["#54A24B", "#F58518", "#4C78A8"])

    for bar_shape, sharpe_value in zip(bars, sharpe_values):
        axis.text(
            bar_shape.get_x() + bar_shape.get_width() / 2,
            sharpe_value + 0.03,
            f"{sharpe_value:.2f}",
            ha="center",
            va="bottom",
            fontsize=11,
        )

    axis.axhline(0, color="black", linewidth=1)
    axis.set_title("Week 6: Sharpe Ratio by Strategy", fontsize=16)
    axis.set_xlabel("Strategy")
    axis.set_ylabel("Sharpe ratio")
    axis.set_ylim(0, max(1.1, sharpe_values.max() + 0.2))
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "strategy_sharpe_ratio_bar.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_drawdown_chart(drawdown: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for strategy_name in drawdown.columns:
        axis.plot(drawdown.index, drawdown[strategy_name] * 100, linewidth=2, label=strategy_name)

    axis.axhline(0, color="black", linewidth=1)
    axis.set_title("Week 6: Strategy Drawdown", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Drawdown (%)")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "strategy_drawdown.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_performance_summary_table(summary: pd.DataFrame) -> pd.DataFrame:
    metric_labels = {
        "strategy_name": "Strategy description",
        "annualized_return_%": "Annualized return (%)",
        "annualized_volatility_%": "Annualized volatility (%)",
        "max_drawdown_%": "Max drawdown (%)",
        "cumulative_return_%": "Cumulative return (%)",
        "sharpe_ratio": "Sharpe ratio",
        "positive_day_ratio_%": "Positive day ratio (%)",
    }

    summary_table = summary.T.rename(index=metric_labels)
    figure_table = summary_table.copy()
    figure_table.loc["Strategy description"] = [
        STRATEGIES[strategy_name]["display_name"] for strategy_name in figure_table.columns
    ]
    figure, axis = plt.subplots(figsize=(12, 5))
    axis.axis("off")
    axis.set_title("Week 6: Strategy Performance Summary", fontsize=16, pad=16)

    cell_text = []
    for _, row_values in figure_table.iterrows():
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
    table.set_fontsize(10)
    table.scale(1, 1.4)

    for (row_number, column_number), cell in table.get_celld().items():
        if row_number == 0 or column_number == -1:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "strategy_performance_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return summary_table


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
    strategy_a = summary.loc["Strategy A"]
    strategy_b = summary.loc["Strategy B"]
    strategy_c = summary.loc["Strategy C"]
    best_sharpe_strategy = summary["sharpe_ratio"].astype(float).idxmax()
    lowest_mdd_strategy = summary["max_drawdown_%"].astype(float).idxmax()

    analysis_markdown = f"""# Week 6 — 포트폴리오 전략 분석

## 주요 결과물 이미지

![Strategy weights](strategy_weights_table.png)

![Strategy cumulative return](strategy_cumulative_return.png)

![Risk return comparison](strategy_risk_return_scatter.png)

![Sharpe ratio](strategy_sharpe_ratio_bar.png)

![Strategy drawdown](strategy_drawdown.png)

![Performance summary](strategy_performance_table.png)

## 전략 성과 요약표

{dataframe_to_markdown_table(summary_table)}

## 분석 내용

이번 6주차 분석은 {price.index.min().date()}부터 {price.index.max().date()}까지의 ETF 일별 수익률을 이용해 세 가지 포트폴리오 전략을 비교했다. 전략 A는 QQQ 100%의 공격적 성장 전략이고, 전략 B는 SPY 50%와 QQQ 50%를 결합한 주식 혼합 전략이며, 전략 C는 SPY 60%와 TLT 40%를 결합한 주식+채권 전략이다. 모든 전략은 매일 고정 비중으로 수익률을 합산하는 방식으로 계산했으며, 무위험 수익률은 연 3%로 두고 Sharpe Ratio를 산출했다.

누적 수익률은 전략 A가 {strategy_a["cumulative_return_%"]:.2f}%로 가장 높았고, 전략 B는 {strategy_b["cumulative_return_%"]:.2f}%, 전략 C는 {strategy_c["cumulative_return_%"]:.2f}%를 기록했다. 이는 4주차에서 확인한 QQQ의 강한 장기 성과가 포트폴리오 전략에서도 그대로 반영된 결과다. 다만 전략 A의 연율화 변동성은 {strategy_a["annualized_volatility_%"]:.2f}%로 가장 높아, 높은 수익률이 가장 큰 가격 변동을 동반했다는 점도 함께 확인된다.

전략 B는 연율화 수익률 {strategy_b["annualized_return_%"]:.2f}%, 변동성 {strategy_b["annualized_volatility_%"]:.2f}%, Sharpe Ratio {strategy_b["sharpe_ratio"]:.2f}를 기록했다. QQQ 단일 전략보다 수익률은 낮지만 변동성과 최대 낙폭도 낮아진다. 즉 SPY를 섞는 방식은 성장성을 일부 유지하면서 QQQ 집중 위험을 줄이는 절충안으로 해석할 수 있다.

전략 C는 TLT를 40% 편입했기 때문에 변동성은 {strategy_c["annualized_volatility_%"]:.2f}%로 낮아졌지만, 누적 수익률과 Sharpe Ratio가 크게 개선되지는 않았다. 특히 분석 기간에 TLT가 장기적으로 부진했고 2022년 이후 큰 낙폭을 겪었기 때문에, 채권 편입이 항상 성과 개선으로 이어지지는 않았다. 이 기간 기준으로 Sharpe Ratio가 가장 높은 전략은 {best_sharpe_strategy}이고, 최대 낙폭이 가장 작았던 전략은 {lowest_mdd_strategy}다.

6주차 결론은 단순 수익률 우선이면 전략 A가 가장 강하지만, 위험을 함께 고려하면 전략 B가 더 균형적인 선택이라는 것이다. 전략 C는 방어적 목적의 후보지만, 금리 상승 환경에서 채권 ETF가 포트폴리오 방어 역할을 충분히 하지 못할 수 있다는 한계가 드러났다. 7주차에서는 고정 전략 3개를 넘어서 임의 비중 조합을 대량으로 생성하고, Sharpe Ratio와 변동성 기준의 최적 포트폴리오를 찾는다.
"""
    (OUTPUT_DIR / "week6_analysis.md").write_text(analysis_markdown, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    price = load_price_data()
    asset_returns = price.pct_change().dropna()
    portfolio_returns = calculate_portfolio_returns(asset_returns)
    cumulative = calculate_cumulative_returns(portfolio_returns, price.index[0])
    drawdown = calculate_drawdown(cumulative)
    summary = calculate_summary(portfolio_returns, cumulative, drawdown)

    portfolio_returns.to_csv(OUTPUT_DIR / "week6_portfolio_returns.csv")
    cumulative.to_csv(OUTPUT_DIR / "week6_strategy_cumulative_returns.csv")
    drawdown.to_csv(OUTPUT_DIR / "week6_strategy_drawdown.csv")
    summary.to_csv(OUTPUT_DIR / "week6_strategy_summary.csv")

    save_strategy_weight_table()
    save_cumulative_return_chart(cumulative, summary)
    save_risk_return_scatter(summary)
    save_sharpe_ratio_bar(summary)
    save_drawdown_chart(drawdown)
    summary_table = save_performance_summary_table(summary)
    write_analysis_markdown(price, summary, summary_table)

    print(f"Saved Week 6 outputs to {OUTPUT_DIR}")
    print(summary.to_string())


if __name__ == "__main__":
    main()
