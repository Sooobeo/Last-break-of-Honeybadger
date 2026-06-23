from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "etf_price.csv"
OUTPUT_DIR = ROOT_DIR / "outputs" / "week8"
ASSETS = ["SPY", "QQQ", "TLT"]
TRADING_DAYS = 252
RISK_FREE_RATE = 0.03
NUM_PORTFOLIOS = 10_000
RANDOM_SEED = 42

MANUAL_STRATEGIES = {
    "Strategy A": {
        "type": "Manual",
        "description": "QQQ only",
        "weights": {"SPY": 0.0, "QQQ": 1.0, "TLT": 0.0},
    },
    "Strategy B": {
        "type": "Manual",
        "description": "Equity mix",
        "weights": {"SPY": 0.5, "QQQ": 0.5, "TLT": 0.0},
    },
    "Strategy C": {
        "type": "Manual",
        "description": "Equity + bond",
        "weights": {"SPY": 0.6, "QQQ": 0.0, "TLT": 0.4},
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


def optimize_portfolios(asset_returns: pd.DataFrame) -> dict[str, dict[str, object]]:
    rng = np.random.default_rng(RANDOM_SEED)
    weights = rng.dirichlet(np.ones(len(ASSETS)), size=NUM_PORTFOLIOS)

    annual_returns = asset_returns[ASSETS].mean().to_numpy() * TRADING_DAYS
    annual_covariance = asset_returns[ASSETS].cov().to_numpy() * TRADING_DAYS
    portfolio_returns = weights @ annual_returns
    portfolio_volatility = np.sqrt(np.einsum("ij,jk,ik->i", weights, annual_covariance, weights))
    sharpe_ratio = (portfolio_returns - RISK_FREE_RATE) / portfolio_volatility

    max_sharpe_index = int(np.argmax(sharpe_ratio))
    min_volatility_index = int(np.argmin(portfolio_volatility))

    return {
        "Max Sharpe": {
            "type": "Optimized",
            "description": "Max Sharpe",
            "weights": {
                asset_name: float(weights[max_sharpe_index, asset_index])
                for asset_index, asset_name in enumerate(ASSETS)
            },
        },
        "Min Volatility": {
            "type": "Optimized",
            "description": "Min volatility",
            "weights": {
                asset_name: float(weights[min_volatility_index, asset_index])
                for asset_index, asset_name in enumerate(ASSETS)
            },
        },
    }


def calculate_strategy_returns(
    asset_returns: pd.DataFrame,
    strategy_configs: dict[str, dict[str, object]],
) -> pd.DataFrame:
    strategy_returns = pd.DataFrame(index=asset_returns.index)

    for strategy_name, strategy_config in strategy_configs.items():
        weights = pd.Series(strategy_config["weights"], dtype=float)
        strategy_returns[strategy_name] = (asset_returns[ASSETS] * weights[ASSETS]).sum(axis=1)

    return strategy_returns


def calculate_cumulative_returns(strategy_returns: pd.DataFrame, start_date: pd.Timestamp) -> pd.DataFrame:
    cumulative = (1 + strategy_returns).cumprod()
    initial_row = pd.DataFrame(
        [[1.0] * len(cumulative.columns)],
        index=[start_date],
        columns=cumulative.columns,
    )
    return pd.concat([initial_row, cumulative]).sort_index()


def calculate_strategy_summary(
    strategy_returns: pd.DataFrame,
    cumulative: pd.DataFrame,
    drawdown: pd.DataFrame,
    strategy_configs: dict[str, dict[str, object]],
) -> pd.DataFrame:
    annualized_return = strategy_returns.mean() * TRADING_DAYS
    annualized_volatility = strategy_returns.std() * (TRADING_DAYS**0.5)
    sharpe_ratio = (annualized_return - RISK_FREE_RATE) / annualized_volatility

    summary = pd.DataFrame(
        {
            "type": [strategy_configs[strategy_name]["type"] for strategy_name in strategy_returns.columns],
            "description": [
                strategy_configs[strategy_name]["description"] for strategy_name in strategy_returns.columns
            ],
            "annualized_return_%": annualized_return * 100,
            "annualized_volatility_%": annualized_volatility * 100,
            "max_drawdown_%": drawdown.min() * 100,
            "cumulative_return_%": (cumulative.iloc[-1] - 1) * 100,
            "sharpe_ratio": sharpe_ratio,
            "positive_day_ratio_%": (strategy_returns > 0).mean() * 100,
        },
        index=strategy_returns.columns,
    )

    for asset_name in ASSETS:
        summary[f"{asset_name}_weight_%"] = [
            strategy_configs[strategy_name]["weights"][asset_name] * 100
            for strategy_name in strategy_returns.columns
        ]

    numeric_columns = summary.select_dtypes("number").columns
    summary[numeric_columns] = summary[numeric_columns].round(2)
    return summary


def build_recommendation_table(summary: pd.DataFrame) -> pd.DataFrame:
    recommendations = pd.DataFrame(
        [
            {
                "investor_profile": "Aggressive",
                "recommended_strategy": "Strategy A",
                "reason": "Highest cumulative return and near-identical result to Max Sharpe",
            },
            {
                "investor_profile": "Balanced",
                "recommended_strategy": "Strategy B",
                "reason": "Strong return with lower concentration risk than QQQ-only",
            },
            {
                "investor_profile": "Conservative",
                "recommended_strategy": "Strategy C",
                "reason": "Lower drawdown than equity-only strategies with better return than Min Volatility",
            },
        ]
    )

    for metric_name in [
        "annualized_return_%",
        "annualized_volatility_%",
        "max_drawdown_%",
        "cumulative_return_%",
        "sharpe_ratio",
        *[f"{asset_name}_weight_%" for asset_name in ASSETS],
    ]:
        recommendations[metric_name] = recommendations["recommended_strategy"].map(summary[metric_name])

    return recommendations


def save_final_comparison_table(summary: pd.DataFrame) -> pd.DataFrame:
    metric_labels = {
        "type": "Type",
        "description": "Description",
        "annualized_return_%": "Annualized return (%)",
        "annualized_volatility_%": "Annualized volatility (%)",
        "max_drawdown_%": "Max drawdown (%)",
        "cumulative_return_%": "Cumulative return (%)",
        "sharpe_ratio": "Sharpe ratio",
        "SPY_weight_%": "SPY weight (%)",
        "QQQ_weight_%": "QQQ weight (%)",
        "TLT_weight_%": "TLT weight (%)",
    }

    selected_rows = list(metric_labels.keys())
    table_data = summary[selected_rows].T.rename(index=metric_labels)

    figure, axis = plt.subplots(figsize=(15, 6))
    axis.axis("off")
    axis.set_title("Week 8: Final Strategy Comparison", fontsize=16, pad=16)

    cell_text = []
    for _, row_values in table_data.iterrows():
        formatted_row = []
        for value in row_values:
            if isinstance(value, str):
                formatted_row.append(value)
            else:
                formatted_row.append(f"{value:.2f}")
        cell_text.append(formatted_row)

    table = axis.table(
        cellText=cell_text,
        rowLabels=table_data.index,
        colLabels=table_data.columns,
        cellLoc="center",
        rowLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(8.7)
    table.scale(1, 1.35)

    for (row_number, column_number), cell in table.get_celld().items():
        if row_number == 0 or column_number == -1:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "final_strategy_comparison_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return table_data


def save_recommendation_table(recommendations: pd.DataFrame) -> pd.DataFrame:
    selected_columns = [
        "investor_profile",
        "recommended_strategy",
        "annualized_return_%",
        "annualized_volatility_%",
        "max_drawdown_%",
        "sharpe_ratio",
        "SPY_weight_%",
        "QQQ_weight_%",
        "TLT_weight_%",
    ]
    table_data = recommendations[selected_columns].copy()
    table_data.columns = [
        "Investor",
        "Strategy",
        "Return (%)",
        "Volatility (%)",
        "MDD (%)",
        "Sharpe",
        "SPY (%)",
        "QQQ (%)",
        "TLT (%)",
    ]

    figure, axis = plt.subplots(figsize=(13, 3.8))
    axis.axis("off")
    axis.set_title("Week 8: Investor Profile Recommendations", fontsize=16, pad=16)

    cell_text = []
    for _, row_values in table_data.iterrows():
        formatted_row = []
        for value in row_values:
            if isinstance(value, str):
                formatted_row.append(value)
            else:
                formatted_row.append(f"{value:.2f}")
        cell_text.append(formatted_row)

    table = axis.table(
        cellText=cell_text,
        colLabels=table_data.columns,
        cellLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.45)

    for (row_number, _), cell in table.get_celld().items():
        if row_number == 0:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "investor_recommendations_table.png", dpi=160, bbox_inches="tight")
    plt.close(figure)
    return table_data


def save_cumulative_return_chart(cumulative: pd.DataFrame, summary: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for strategy_name in cumulative.columns:
        final_return = summary.loc[strategy_name, "cumulative_return_%"]
        axis.plot(cumulative.index, cumulative[strategy_name], linewidth=2, label=f"{strategy_name} ({final_return:.1f}%)")

    axis.axhline(1, color="black", linestyle="--", linewidth=1)
    axis.set_title("Week 8: Final Cumulative Return Comparison", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Growth of $1")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "final_cumulative_return_comparison.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_risk_return_chart(summary: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(9, 6))
    colors = {
        "Manual": "#4C78A8",
        "Optimized": "#E45756",
    }

    for strategy_name, row_values in summary.iterrows():
        axis.scatter(
            row_values["annualized_volatility_%"],
            row_values["annualized_return_%"],
            s=170,
            color=colors[row_values["type"]],
            edgecolor="black",
        )
        axis.annotate(
            strategy_name,
            (row_values["annualized_volatility_%"], row_values["annualized_return_%"]),
            xytext=(8, 8),
            textcoords="offset points",
            fontsize=10,
        )

    axis.set_title("Week 8: Final Risk-Return Map", fontsize=16)
    axis.set_xlabel("Annualized volatility (%)")
    axis.set_ylabel("Annualized return (%)")
    axis.grid(True, alpha=0.3)

    handles = [
        plt.Line2D([0], [0], marker="o", color="w", markerfacecolor=color, markeredgecolor="black", markersize=10)
        for color in colors.values()
    ]
    axis.legend(handles, colors.keys())
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "final_risk_return_map.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_sharpe_mdd_chart(summary: pd.DataFrame) -> None:
    figure, axes = plt.subplots(1, 2, figsize=(14, 5))
    sorted_sharpe = summary.sort_values("sharpe_ratio", ascending=False)
    sorted_mdd = summary.sort_values("max_drawdown_%", ascending=False)

    axes[0].bar(sorted_sharpe.index, sorted_sharpe["sharpe_ratio"], color="#54A24B")
    axes[0].set_title("Sharpe Ratio")
    axes[0].set_ylabel("Sharpe")
    axes[0].tick_params(axis="x", rotation=30)
    for bar_shape, value in zip(axes[0].patches, sorted_sharpe["sharpe_ratio"]):
        axes[0].text(bar_shape.get_x() + bar_shape.get_width() / 2, value + 0.02, f"{value:.2f}", ha="center")

    axes[1].bar(sorted_mdd.index, sorted_mdd["max_drawdown_%"], color="#F58518")
    axes[1].set_title("Maximum Drawdown")
    axes[1].set_ylabel("MDD (%)")
    axes[1].axhline(0, color="black", linewidth=1)
    axes[1].tick_params(axis="x", rotation=30)
    for bar_shape, value in zip(axes[1].patches, sorted_mdd["max_drawdown_%"]):
        axes[1].text(bar_shape.get_x() + bar_shape.get_width() / 2, value - 1.0, f"{value:.1f}%", ha="center", va="top")

    figure.suptitle("Week 8: Sharpe and Drawdown Comparison", fontsize=16)
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "final_sharpe_mdd_comparison.png", dpi=160, bbox_inches="tight")
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


def recommendations_to_markdown(recommendations: pd.DataFrame) -> str:
    headers = ["Investor", "Recommended strategy", "Reason"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]

    for _, row_values in recommendations.iterrows():
        lines.append(
            "| "
            + " | ".join(
                [
                    row_values["investor_profile"],
                    row_values["recommended_strategy"],
                    row_values["reason"],
                ]
            )
            + " |"
        )

    return "\n".join(lines)


def write_final_report(
    price: pd.DataFrame,
    summary: pd.DataFrame,
    comparison_table: pd.DataFrame,
    recommendations: pd.DataFrame,
) -> None:
    strategy_a = summary.loc["Strategy A"]
    strategy_b = summary.loc["Strategy B"]
    strategy_c = summary.loc["Strategy C"]
    max_sharpe = summary.loc["Max Sharpe"]
    min_volatility = summary.loc["Min Volatility"]
    best_sharpe_name = summary["sharpe_ratio"].idxmax()
    best_mdd_name = summary["max_drawdown_%"].idxmax()

    report = f"""# Week 8 — 최종 결과 정리 및 전략 제안

## 주요 결과물 이미지

![Final strategy comparison](final_strategy_comparison_table.png)

![Final cumulative return comparison](final_cumulative_return_comparison.png)

![Final risk return map](final_risk_return_map.png)

![Sharpe and MDD comparison](final_sharpe_mdd_comparison.png)

![Investor recommendations](investor_recommendations_table.png)

## 최종 전략 비교표

{dataframe_to_markdown_table(comparison_table)}

## 투자자 성향별 추천

{recommendations_to_markdown(recommendations)}

## 분석 내용

이번 최종 정리는 {price.index.min().date()}부터 {price.index.max().date()}까지의 ETF 데이터를 기반으로 6주차 수동 전략 3개와 7주차 최적화 전략 2개를 같은 기준에서 비교했다. 비교 지표는 누적 수익률, 연율화 수익률, 연율화 변동성, 최대 낙폭, Sharpe Ratio이며, 무위험 수익률은 앞선 분석과 동일하게 연 3%로 가정했다.

수익률 관점에서는 Strategy A가 누적 수익률 {strategy_a["cumulative_return_%"]:.2f}%로 가장 높다. Max Sharpe 전략도 누적 수익률 {max_sharpe["cumulative_return_%"]:.2f}%로 Strategy A와 거의 유사한데, 이는 7주차 최적화 결과가 QQQ 비중 {max_sharpe["QQQ_weight_%"]:.2f}%의 QQQ 중심 구조로 수렴했기 때문이다. 즉 2015~2024년 구간에서는 QQQ 노출이 장기 성과를 좌우한 핵심 요인이었다.

위험 대비 성과 관점에서는 {best_sharpe_name}의 Sharpe Ratio가 {summary.loc[best_sharpe_name, "sharpe_ratio"]:.2f}로 가장 높다. 다만 Strategy A와 Max Sharpe는 모두 QQQ 집중도가 높아 최대 낙폭이 약 -35% 수준이다. 성장성이 강한 대신 큰 손실 구간을 견뎌야 한다는 의미다. 반대로 Strategy B는 누적 수익률 {strategy_b["cumulative_return_%"]:.2f}%, Sharpe Ratio {strategy_b["sharpe_ratio"]:.2f}, 최대 낙폭 {strategy_b["max_drawdown_%"]:.2f}%로 수익성과 리스크의 균형이 가장 현실적인 절충안에 가깝다.

방어적 전략에서는 Strategy C와 Min Volatility를 구분해서 해석해야 한다. Min Volatility는 연율화 변동성 {min_volatility["annualized_volatility_%"]:.2f}%로 가장 낮지만 누적 수익률은 {min_volatility["cumulative_return_%"]:.2f}%에 그친다. Strategy C는 변동성이 {strategy_c["annualized_volatility_%"]:.2f}%로 조금 높지만 누적 수익률 {strategy_c["cumulative_return_%"]:.2f}%와 최대 낙폭 {strategy_c["max_drawdown_%"]:.2f}%가 더 나은 편이다. 따라서 단순히 변동성을 최소화하는 것보다 실제 성과와 낙폭을 함께 보는 것이 더 타당하다.

최종 제안은 투자자 성향별로 나누는 것이 합리적이다. 공격형 투자자는 큰 낙폭을 감수할 수 있다면 Strategy A 또는 Max Sharpe를 선택할 수 있다. 중립형 투자자에게는 Strategy B가 가장 적합하다. QQQ의 성장성을 유지하면서 SPY를 통해 집중 위험을 낮추기 때문이다. 안정형 투자자에게는 Strategy C가 더 현실적이다. Min Volatility보다 변동성은 약간 높지만, 성과와 낙폭 지표를 함께 보면 더 균형적인 방어형 전략이다.

전체 프로젝트의 핵심 결론은 수익률만으로는 전략을 결정할 수 없다는 것이다. QQQ 중심 전략은 높은 성과를 냈지만 큰 낙폭을 동반했고, TLT 편입 전략은 변동성 완화 가능성이 있지만 금리 상승기에는 방어력이 제한되었다. 따라서 포트폴리오 설계에서는 수익률, 변동성, 최대 낙폭, Sharpe Ratio를 함께 보고 투자자 성향에 맞게 전략을 선택해야 한다.
"""
    (OUTPUT_DIR / "week8_final_report.md").write_text(report, encoding="utf-8")


def write_presentation_notes(summary: pd.DataFrame) -> None:
    notes = f"""# 발표용 요약 노트

1. 프로젝트 목표: SPY, QQQ, TLT 데이터를 활용해 리스크 기반 포트폴리오 전략을 설계하고 비교한다.
2. 데이터 기간: 2015년 1월 2일 ~ 2024년 12월 30일.
3. 핵심 관찰: QQQ는 가장 높은 장기 수익률을 기록했지만 변동성과 낙폭도 크다.
4. 리스크 관찰: TLT는 변동성 완화 후보지만 2022년 이후 금리 상승 국면에서 큰 낙폭을 보였다.
5. 전략 비교: Strategy A는 최고 수익, Strategy B는 균형형, Strategy C는 방어형에 가깝다.
6. 최적화 결과: Max Sharpe는 QQQ 중심, Min Volatility는 SPY와 TLT 중심으로 도출되었다.
7. 최종 추천: 공격형은 Strategy A, 중립형은 Strategy B, 안정형은 Strategy C.
8. 최종 결론: 최적 포트폴리오는 하나로 고정되지 않고 투자자의 위험 감내도에 따라 달라진다.

핵심 수치:
- Strategy A: 누적 수익률 {summary.loc["Strategy A", "cumulative_return_%"]:.2f}%, Sharpe {summary.loc["Strategy A", "sharpe_ratio"]:.2f}
- Strategy B: 누적 수익률 {summary.loc["Strategy B", "cumulative_return_%"]:.2f}%, Sharpe {summary.loc["Strategy B", "sharpe_ratio"]:.2f}
- Strategy C: 누적 수익률 {summary.loc["Strategy C", "cumulative_return_%"]:.2f}%, Sharpe {summary.loc["Strategy C", "sharpe_ratio"]:.2f}
- Max Sharpe: QQQ 비중 {summary.loc["Max Sharpe", "QQQ_weight_%"]:.2f}%, Sharpe {summary.loc["Max Sharpe", "sharpe_ratio"]:.2f}
- Min Volatility: 변동성 {summary.loc["Min Volatility", "annualized_volatility_%"]:.2f}%, 누적 수익률 {summary.loc["Min Volatility", "cumulative_return_%"]:.2f}%
"""
    (OUTPUT_DIR / "presentation_notes.md").write_text(notes, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    price = load_price_data()
    asset_returns = price.pct_change().dropna()
    optimized_strategies = optimize_portfolios(asset_returns)
    strategy_configs = {**MANUAL_STRATEGIES, **optimized_strategies}

    strategy_returns = calculate_strategy_returns(asset_returns, strategy_configs)
    cumulative = calculate_cumulative_returns(strategy_returns, price.index[0])
    drawdown = cumulative / cumulative.cummax() - 1
    summary = calculate_strategy_summary(strategy_returns, cumulative, drawdown, strategy_configs)
    recommendations = build_recommendation_table(summary)

    strategy_returns.to_csv(OUTPUT_DIR / "week8_strategy_returns.csv")
    cumulative.to_csv(OUTPUT_DIR / "week8_cumulative_returns.csv")
    drawdown.to_csv(OUTPUT_DIR / "week8_drawdown.csv")
    summary.to_csv(OUTPUT_DIR / "week8_final_strategy_summary.csv")
    recommendations.to_csv(OUTPUT_DIR / "week8_investor_recommendations.csv", index=False)

    comparison_table = save_final_comparison_table(summary)
    save_recommendation_table(recommendations)
    save_cumulative_return_chart(cumulative, summary)
    save_risk_return_chart(summary)
    save_sharpe_mdd_chart(summary)
    write_final_report(price, summary, comparison_table, recommendations)
    write_presentation_notes(summary)

    print(f"Saved Week 8 outputs to {OUTPUT_DIR}")
    print(summary.to_string())
    print()
    print(recommendations[["investor_profile", "recommended_strategy", "reason"]].to_string(index=False))


if __name__ == "__main__":
    main()
