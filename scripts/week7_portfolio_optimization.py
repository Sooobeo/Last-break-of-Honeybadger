from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "etf_price.csv"
OUTPUT_DIR = ROOT_DIR / "outputs" / "week7"
ASSETS = ["SPY", "QQQ", "TLT"]
TRADING_DAYS = 252
RISK_FREE_RATE = 0.03
NUM_PORTFOLIOS = 10_000
RANDOM_SEED = 42


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


def simulate_portfolios(asset_returns: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    rng = np.random.default_rng(RANDOM_SEED)
    weights = rng.dirichlet(np.ones(len(ASSETS)), size=NUM_PORTFOLIOS)

    annual_returns = asset_returns[ASSETS].mean().to_numpy() * TRADING_DAYS
    annual_covariance = asset_returns[ASSETS].cov().to_numpy() * TRADING_DAYS

    portfolio_returns = weights @ annual_returns
    portfolio_volatility = np.sqrt(np.einsum("ij,jk,ik->i", weights, annual_covariance, weights))
    sharpe_ratio = (portfolio_returns - RISK_FREE_RATE) / portfolio_volatility

    simulations = pd.DataFrame(
        {
            "portfolio_id": np.arange(1, NUM_PORTFOLIOS + 1),
            "annualized_return_%": portfolio_returns * 100,
            "annualized_volatility_%": portfolio_volatility * 100,
            "sharpe_ratio": sharpe_ratio,
        }
    )

    for asset_index, asset_name in enumerate(ASSETS):
        simulations[f"{asset_name}_weight_%"] = weights[:, asset_index] * 100

    return simulations, weights


def select_optimal_portfolios(simulations: pd.DataFrame, weights: np.ndarray) -> pd.DataFrame:
    max_sharpe_index = simulations["sharpe_ratio"].idxmax()
    min_volatility_index = simulations["annualized_volatility_%"].idxmin()

    optimal_rows = pd.DataFrame(
        [
            simulations.loc[max_sharpe_index],
            simulations.loc[min_volatility_index],
        ],
        index=["Max Sharpe Portfolio", "Min Volatility Portfolio"],
    )
    optimal_rows["optimization_goal"] = optimal_rows.index
    optimal_rows["portfolio_id"] = optimal_rows["portfolio_id"].astype(int)

    for asset_index, asset_name in enumerate(ASSETS):
        optimal_rows[f"{asset_name}_weight_%"] = weights[
            [max_sharpe_index, min_volatility_index], asset_index
        ] * 100

    return optimal_rows[
        [
            "optimization_goal",
            "portfolio_id",
            "annualized_return_%",
            "annualized_volatility_%",
            "sharpe_ratio",
            *[f"{asset_name}_weight_%" for asset_name in ASSETS],
        ]
    ]


def calculate_optimal_time_series(
    asset_returns: pd.DataFrame,
    optimal_portfolios: pd.DataFrame,
    start_date: pd.Timestamp,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    portfolio_returns = pd.DataFrame(index=asset_returns.index)

    for portfolio_name, row_values in optimal_portfolios.iterrows():
        weights = pd.Series(
            {
                asset_name: row_values[f"{asset_name}_weight_%"] / 100
                for asset_name in ASSETS
            }
        )
        portfolio_returns[portfolio_name] = (asset_returns[ASSETS] * weights[ASSETS]).sum(axis=1)

    cumulative = (1 + portfolio_returns).cumprod()
    initial_row = pd.DataFrame(
        [[1.0] * len(cumulative.columns)],
        index=[start_date],
        columns=cumulative.columns,
    )
    cumulative = pd.concat([initial_row, cumulative]).sort_index()
    drawdown = cumulative / cumulative.cummax() - 1
    return portfolio_returns, cumulative, drawdown


def append_realized_metrics(
    optimal_portfolios: pd.DataFrame,
    portfolio_returns: pd.DataFrame,
    cumulative: pd.DataFrame,
    drawdown: pd.DataFrame,
) -> pd.DataFrame:
    enriched = optimal_portfolios.copy()
    realized_return = portfolio_returns.mean() * TRADING_DAYS * 100
    realized_volatility = portfolio_returns.std() * (TRADING_DAYS**0.5) * 100
    realized_sharpe = ((realized_return / 100) - RISK_FREE_RATE) / (realized_volatility / 100)
    cumulative_return = (cumulative.iloc[-1] - 1) * 100
    max_drawdown = drawdown.min() * 100

    enriched["cumulative_return_%"] = cumulative_return
    enriched["max_drawdown_%"] = max_drawdown
    enriched["realized_annualized_return_%"] = realized_return
    enriched["realized_annualized_volatility_%"] = realized_volatility
    enriched["realized_sharpe_ratio"] = realized_sharpe

    numeric_columns = enriched.select_dtypes("number").columns
    enriched[numeric_columns] = enriched[numeric_columns].round(2)
    return enriched


def save_efficient_frontier(
    simulations: pd.DataFrame,
    optimal_portfolios: pd.DataFrame,
) -> None:
    figure, axis = plt.subplots(figsize=(10, 7))
    scatter = axis.scatter(
        simulations["annualized_volatility_%"],
        simulations["annualized_return_%"],
        c=simulations["sharpe_ratio"],
        cmap="viridis",
        alpha=0.55,
        s=12,
    )
    colorbar = figure.colorbar(scatter, ax=axis)
    colorbar.set_label("Sharpe ratio")

    markers = {
        "Max Sharpe Portfolio": ("*", "#E45756", 280),
        "Min Volatility Portfolio": ("X", "#F58518", 180),
    }
    for portfolio_name, (marker, color, size) in markers.items():
        row_values = optimal_portfolios.loc[portfolio_name]
        axis.scatter(
            row_values["annualized_volatility_%"],
            row_values["annualized_return_%"],
            marker=marker,
            s=size,
            color=color,
            edgecolor="black",
            linewidth=1,
            label=portfolio_name,
        )

    axis.set_title("Week 7: Efficient Frontier Simulation", fontsize=16)
    axis.set_xlabel("Annualized volatility (%)")
    axis.set_ylabel("Annualized return (%)")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "efficient_frontier.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_optimal_weights_chart(optimal_portfolios: pd.DataFrame) -> None:
    weights_table = optimal_portfolios[[f"{asset_name}_weight_%" for asset_name in ASSETS]].copy()
    weights_table.columns = ASSETS

    figure, axis = plt.subplots(figsize=(9, 5))
    bottom = np.zeros(len(weights_table))
    colors = ["#4C78A8", "#F58518", "#54A24B"]

    for asset_name, color in zip(ASSETS, colors):
        axis.bar(weights_table.index, weights_table[asset_name], bottom=bottom, label=asset_name, color=color)
        bottom += weights_table[asset_name].to_numpy()

    for portfolio_index, portfolio_name in enumerate(weights_table.index):
        cumulative_height = 0
        for asset_name in ASSETS:
            weight_value = weights_table.loc[portfolio_name, asset_name]
            if weight_value >= 7:
                axis.text(
                    portfolio_index,
                    cumulative_height + weight_value / 2,
                    f"{weight_value:.1f}%",
                    ha="center",
                    va="center",
                    color="white",
                    fontsize=10,
                    weight="bold",
                )
            cumulative_height += weight_value

    axis.set_title("Week 7: Optimal Portfolio Weights", fontsize=16)
    axis.set_xlabel("Portfolio")
    axis.set_ylabel("Weight (%)")
    axis.set_ylim(0, 100)
    axis.legend(loc="upper right")
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "optimal_weights_bar.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_optimal_cumulative_return_chart(cumulative: pd.DataFrame) -> None:
    figure, axis = plt.subplots(figsize=(14, 6))

    for portfolio_name in cumulative.columns:
        final_return = (cumulative[portfolio_name].iloc[-1] - 1) * 100
        axis.plot(cumulative.index, cumulative[portfolio_name], linewidth=2, label=f"{portfolio_name} ({final_return:.1f}%)")

    axis.axhline(1, color="black", linestyle="--", linewidth=1)
    axis.set_title("Week 7: Optimal Portfolio Cumulative Return", fontsize=16)
    axis.set_xlabel("Date")
    axis.set_ylabel("Growth of $1")
    axis.grid(True, alpha=0.3)
    axis.legend()
    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "optimal_cumulative_return.png", dpi=160, bbox_inches="tight")
    plt.close(figure)


def save_optimal_summary_table(optimal_portfolios: pd.DataFrame) -> pd.DataFrame:
    metric_labels = {
        "portfolio_id": "Simulation ID",
        "annualized_return_%": "Expected annualized return (%)",
        "annualized_volatility_%": "Expected annualized volatility (%)",
        "sharpe_ratio": "Expected Sharpe ratio",
        "SPY_weight_%": "SPY weight (%)",
        "QQQ_weight_%": "QQQ weight (%)",
        "TLT_weight_%": "TLT weight (%)",
        "cumulative_return_%": "Realized cumulative return (%)",
        "max_drawdown_%": "Realized max drawdown (%)",
        "realized_annualized_return_%": "Realized annualized return (%)",
        "realized_annualized_volatility_%": "Realized annualized volatility (%)",
        "realized_sharpe_ratio": "Realized Sharpe ratio",
    }

    summary_table = optimal_portfolios.drop(columns=["optimization_goal"]).T.rename(index=metric_labels)
    figure, axis = plt.subplots(figsize=(12, 7))
    axis.axis("off")
    axis.set_title("Week 7: Optimal Portfolio Summary", fontsize=16, pad=16)

    cell_text = [
        [f"{value:.2f}" for value in row_values]
        for _, row_values in summary_table.iterrows()
    ]
    table = axis.table(
        cellText=cell_text,
        rowLabels=summary_table.index,
        colLabels=summary_table.columns,
        cellLoc="center",
        rowLoc="center",
        loc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9.5)
    table.scale(1, 1.35)

    for (row_number, column_number), cell in table.get_celld().items():
        if row_number == 0 or column_number == -1:
            cell.set_text_props(weight="bold")
            cell.set_facecolor("#EAF2F8")

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "optimal_portfolio_summary_table.png", dpi=160, bbox_inches="tight")
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


def write_analysis_markdown(
    price: pd.DataFrame,
    simulations: pd.DataFrame,
    optimal_portfolios: pd.DataFrame,
    summary_table: pd.DataFrame,
) -> None:
    max_sharpe = optimal_portfolios.loc["Max Sharpe Portfolio"]
    min_volatility = optimal_portfolios.loc["Min Volatility Portfolio"]

    analysis_markdown = f"""# Week 7 — 포트폴리오 최적화

## 주요 결과물 이미지

![Efficient frontier](efficient_frontier.png)

![Optimal weights](optimal_weights_bar.png)

![Optimal cumulative return](optimal_cumulative_return.png)

![Optimal summary](optimal_portfolio_summary_table.png)

## 최적 포트폴리오 요약표

{dataframe_to_markdown_table(summary_table)}

## 분석 내용

이번 7주차 분석은 {price.index.min().date()}부터 {price.index.max().date()}까지의 SPY, QQQ, TLT 일별 수익률을 기반으로 {len(simulations):,}개의 랜덤 비중 조합을 생성하고, 각 조합의 기대 연율화 수익률, 연율화 변동성, Sharpe Ratio를 계산했다. 비중은 세 자산 합계가 100%가 되도록 Dirichlet 분포로 생성했으며, 무위험 수익률은 6주차와 동일하게 연 3%로 가정했다.

Efficient Frontier 산점도는 변동성이 커질수록 기대 수익률도 높아지는 전형적인 위험·수익 관계를 보여준다. 다만 같은 변동성 수준에서도 Sharpe Ratio가 다른 포트폴리오가 존재하므로, 단순히 수익률이 높은 조합을 선택하는 것보다 동일 위험에서 더 높은 보상을 주는 조합을 찾는 것이 중요하다. 색상이 밝게 나타나는 구간은 위험 대비 수익 효율이 높은 조합이며, 이 구간에서 Max Sharpe Portfolio가 선택된다.

Max Sharpe Portfolio는 SPY {max_sharpe["SPY_weight_%"]:.2f}%, QQQ {max_sharpe["QQQ_weight_%"]:.2f}%, TLT {max_sharpe["TLT_weight_%"]:.2f}%로 구성된다. 기대 연율화 수익률은 {max_sharpe["annualized_return_%"]:.2f}%, 기대 변동성은 {max_sharpe["annualized_volatility_%"]:.2f}%, Sharpe Ratio는 {max_sharpe["sharpe_ratio"]:.2f}다. 이 결과는 분석 기간에서 QQQ의 성장성과 위험 대비 성과가 워낙 강했기 때문에, Sharpe Ratio 최적화가 사실상 QQQ 중심 포트폴리오로 수렴했음을 의미한다. 즉 이 기간에는 분산 자체보다 QQQ 노출 여부가 수익 효율을 크게 좌우했다.

Min Volatility Portfolio는 SPY {min_volatility["SPY_weight_%"]:.2f}%, QQQ {min_volatility["QQQ_weight_%"]:.2f}%, TLT {min_volatility["TLT_weight_%"]:.2f}%로 구성된다. 기대 연율화 수익률은 {min_volatility["annualized_return_%"]:.2f}%, 기대 변동성은 {min_volatility["annualized_volatility_%"]:.2f}%, Sharpe Ratio는 {min_volatility["sharpe_ratio"]:.2f}다. 변동성 최소화 목적에서는 TLT 비중이 크게 올라가지만, 2015~2024년 기간에는 TLT의 장기 성과가 약했기 때문에 누적 성과는 Max Sharpe 포트폴리오보다 낮아진다.

7주차 결론은 최적화 기준에 따라 전혀 다른 포트폴리오가 선택된다는 것이다. 수익 효율을 중시하면 Max Sharpe Portfolio가 적합하고, 가격 흔들림 자체를 최소화하려면 Min Volatility Portfolio가 적합하다. 그러나 Min Volatility는 수익 기회도 크게 줄일 수 있으므로, 최종 전략 제안에서는 6주차의 고정 전략과 7주차의 최적화 전략을 함께 비교해 투자자 성향별 추천안을 분리하는 것이 타당하다.
"""
    (OUTPUT_DIR / "week7_analysis.md").write_text(analysis_markdown, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    price = load_price_data()
    asset_returns = price.pct_change().dropna()
    simulations, weights = simulate_portfolios(asset_returns)
    optimal_portfolios = select_optimal_portfolios(simulations, weights)
    optimal_returns, optimal_cumulative, optimal_drawdown = calculate_optimal_time_series(
        asset_returns,
        optimal_portfolios,
        price.index[0],
    )
    enriched_optimal_portfolios = append_realized_metrics(
        optimal_portfolios,
        optimal_returns,
        optimal_cumulative,
        optimal_drawdown,
    )

    simulations.round(4).to_csv(OUTPUT_DIR / "week7_monte_carlo_simulations.csv", index=False)
    enriched_optimal_portfolios.to_csv(OUTPUT_DIR / "week7_optimal_portfolios.csv")
    optimal_returns.to_csv(OUTPUT_DIR / "week7_optimal_portfolio_returns.csv")
    optimal_cumulative.to_csv(OUTPUT_DIR / "week7_optimal_cumulative_returns.csv")
    optimal_drawdown.to_csv(OUTPUT_DIR / "week7_optimal_drawdown.csv")

    save_efficient_frontier(simulations, enriched_optimal_portfolios)
    save_optimal_weights_chart(enriched_optimal_portfolios)
    save_optimal_cumulative_return_chart(optimal_cumulative)
    summary_table = save_optimal_summary_table(enriched_optimal_portfolios)
    write_analysis_markdown(price, simulations, enriched_optimal_portfolios, summary_table)

    print(f"Saved Week 7 outputs to {OUTPUT_DIR}")
    print(enriched_optimal_portfolios.to_string())


if __name__ == "__main__":
    main()
