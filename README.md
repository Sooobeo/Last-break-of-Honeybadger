# Risk-Aware Portfolio Strategy & Optimization

SPY, QQQ, TLT ETF 데이터를 이용해 수익률과 리스크를 함께 분석하고, 투자자 성향별 포트폴리오 전략을 제안하는 프로젝트입니다.

상세 프로젝트 소개 문서는 [`outputs/introducing.md`](outputs/introducing.md)에 정리되어 있습니다.

## 프로젝트 목표

- ETF 가격 데이터를 수집하고 전처리합니다.
- 자산별 수익률, 변동성, 최대 낙폭을 계산합니다.
- QQQ 단일, 주식 혼합, 주식+채권 전략을 비교합니다.
- Monte Carlo 시뮬레이션으로 Efficient Frontier와 최적 포트폴리오를 도출합니다.
- 공격형, 중립형, 안정형 투자자별 최종 전략을 제안합니다.

## 분석 대상

| ETF | 설명 | 역할 |
| --- | --- | --- |
| `SPY` | S&P 500 대표 ETF | 미국 주식시장 기준 자산 |
| `QQQ` | 나스닥 100 ETF | 성장형·기술주 중심 자산 |
| `TLT` | 미국 장기 국채 ETF | 채권형 분산 후보 |

분석 기간은 `2015-01-02`부터 `2024-12-30`까지입니다.

## 주요 결과

| 전략 | 구성 | 누적 수익률 | 변동성 | 최대 낙폭 | Sharpe |
| --- | --- | ---: | ---: | ---: | ---: |
| Strategy A | QQQ 100% | 441.24% | 21.82% | -35.12% | 0.75 |
| Strategy B | SPY 50% + QQQ 50% | 333.37% | 19.37% | -30.86% | 0.70 |
| Strategy C | SPY 60% + TLT 40% | 115.32% | 11.05% | -27.24% | 0.48 |
| Max Sharpe | 최적화 전략 | 434.05% | 21.60% | -35.07% | 0.75 |
| Min Volatility | 최적화 전략 | 75.64% | 10.29% | -29.20% | 0.31 |

최종 추천은 다음과 같습니다.

- 공격형: `Strategy A`
- 중립형: `Strategy B`
- 안정형: `Strategy C`

## 프로젝트 구조

```text
.
├── Onboarding.ipynb
├── etf_price.csv
├── plan.md
├── README.md
├── scripts/
│   ├── week4_return_analysis.py
│   ├── week5_risk_analysis.py
│   ├── week6_portfolio_strategy_analysis.py
│   ├── week7_portfolio_optimization.py
│   └── week8_final_strategy_recommendation.py
└── outputs/
    ├── introducing.md
    ├── week4/
    ├── week5/
    ├── week6/
    ├── week7/
    └── week8/
```

## 실행 방법

필요 패키지:

```bash
pip install pandas numpy matplotlib seaborn yfinance ipykernel
```

주차별 분석 실행:

```bash
python scripts/week4_return_analysis.py
python scripts/week5_risk_analysis.py
python scripts/week6_portfolio_strategy_analysis.py
python scripts/week7_portfolio_optimization.py
python scripts/week8_final_strategy_recommendation.py
```

또는 `Onboarding.ipynb`에서 순서대로 실행할 수 있습니다.

## 주요 산출물

- 전체 소개 문서: [`outputs/introducing.md`](outputs/introducing.md)
- 최종 보고서: [`outputs/week8/week8_final_report.md`](outputs/week8/week8_final_report.md)
- 발표 요약 노트: [`outputs/week8/presentation_notes.md`](outputs/week8/presentation_notes.md)
- 최종 비교 이미지: [`outputs/week8/final_strategy_comparison_table.png`](outputs/week8/final_strategy_comparison_table.png)
- 투자자별 추천 이미지: [`outputs/week8/investor_recommendations_table.png`](outputs/week8/investor_recommendations_table.png)

## 핵심 결론

수익률만 보면 QQQ 중심 전략이 가장 우수했지만, 변동성과 최대 낙폭도 함께 컸습니다. SPY와 QQQ를 혼합한 Strategy B는 성장성과 리스크 관리의 균형이 가장 현실적인 선택지로 나타났습니다. TLT는 채권형 분산 후보지만, 금리 상승기에는 큰 손실을 낼 수 있어 별도의 금리 리스크 관리가 필요합니다.

따라서 이 프로젝트의 결론은 하나의 절대적 최적 포트폴리오가 아니라, 투자자의 위험 감내도에 따라 전략을 다르게 선택해야 한다는 것입니다.
