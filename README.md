# Retail Demand Forecasting & Inventory Optimization Dashboard

A polished student business analytics project focused on operational decision-making, retail demand visibility, and inventory optimization.

## Project Goal

Build a Power BI dashboard that combines sales analytics, inventory monitoring, demand forecasting, and replenishment recommendations for a retail operations team.

This project is positioned for:

- Customer Operations Analyst internships
- Business Analyst roles
- Sales / Revenue Operations internships
- Strategy & Analytics internships

## Data Sources

Primary sales dataset used:

- Public Superstore sales CSV from Curran Kelleher's open data repository: `https://raw.githubusercontent.com/curran/data/gh-pages/superstoreSales/superstoreSales.csv`

Inventory project table:

- `data/processed/inventory_clean.csv` is a realistic SKU-region inventory policy table generated from the Superstore product universe and observed demand. It includes inventory level, reorder point, safety stock, warehouse, supplier, and supplier lead time fields.

Optional public inventory datasets to swap in:

- Kaggle Retail Store Inventory Forecasting dataset: `https://www.kaggle.com/datasets/anirudhchauhan/retail-store-inventory-forecasting-dataset`
- Kaggle Supply Chain Inventory and Stock Optimization dataset: `https://www.kaggle.com/datasets/gabrielaava/supply-chain-inventory-and-stock-optimization`
- Kaggle Superstore dataset variants: `https://www.kaggle.com/datasets/vivek468/superstore-dataset-final`

## Folder Structure

```text
data/
  raw/
    superstore_sales_raw.csv
  processed/
    sales_clean.csv
    inventory_clean.csv
    monthly_demand.csv
    forecast_simple.csv
docs/
  power_query_steps.md
  dax_measures.md
  dashboard_layout.md
  business_insights.md
outputs/
  Retail_Demand_Forecasting_Inventory_Optimization_Dashboard.xlsx
  executive_dashboard_preview.png
scripts/
  process_data.py
  build_workbook.mjs
```

## Dataset Fields Covered

Sales table:

- Order Date
- Product
- Category
- Region
- Sales
- Profit
- Quantity
- Customer Segment
- SKU

Inventory table:

- SKU
- Inventory Levels
- Reorder Point
- Safety Stock
- Warehouse / Region
- Supplier Lead Time
- Inventory Status
- Stockout Risk Flag
- Overstock Flag

## Dashboard Pages

1. Executive KPI Dashboard
2. Sales & Demand Analytics
3. Inventory Optimization
4. Forecasting
5. Business Insights / Data Dictionary

## Core KPIs

- Total Revenue
- Total Profit
- Total Units Sold
- Inventory Turnover Ratio
- Stockout Risk %
- Overstock %
- Average Monthly Demand
- Forecast Accuracy
- Profit Margin
- Sell-through Rate

## Forecasting Approach

The project uses a beginner/intermediate forecasting approach:

- Monthly demand grouped by category and region
- 3-month moving average
- Light seasonal adjustment
- 6-month forward forecast

This avoids overcomplicated ML while still showing practical demand planning.

## Power BI Build Steps

1. Open Power BI Desktop.
2. Import the CSV files from `data/processed`.
3. Apply the cleaning steps from `docs/power_query_steps.md`.
4. Create a Date table and relationships.
5. Add DAX measures from `docs/dax_measures.md`.
6. Build the pages using `docs/dashboard_layout.md`.
7. Add insights from `docs/business_insights.md`.
8. Export screenshots for portfolio and resume use.

## Screenshot Suggestions

Capture these views for a portfolio:

- Executive page with all KPI cards visible
- Sales analytics page filtered to the highest-revenue region
- Inventory optimization page showing restock recommendations
- Forecasting page showing actual vs forecast trend
- Drill-through product/SKU detail view

## Resume-Ready Bullet Points

- Built a Power BI retail operations dashboard analyzing `$14.9M+` in sales, `214K+` units sold, regional revenue performance, product profitability, and customer segment trends.
- Designed inventory optimization reporting using SKU-level reorder points, safety stock, supplier lead time, stockout risk, and overstock detection.
- Developed DAX measures for revenue, profit margin, inventory turnover, sell-through rate, forecast variance, stockout rate, and replenishment thresholds.
- Created a simple demand forecasting workflow using monthly demand trends and moving-average forecasting to support replenishment planning.
- Produced executive KPI reporting and operational insights for sales operations, customer operations, and supply chain decision-making.

## Project Positioning

This should be presented as a business intelligence and operations analytics project, not a machine learning project. The strength is the dashboard design, KPI logic, operational recommendations, and stakeholder-friendly explanation.
"# Retail-Demand-Forecasting-Inventory-Optimization-" 
