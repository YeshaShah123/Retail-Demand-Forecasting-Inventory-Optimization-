# Power BI Dashboard Layout

## Page 1: Executive KPI Dashboard

Purpose: leadership-ready overview of sales, margin, inventory health, and replenishment risk.

Top KPI cards:

- Total Revenue
- Total Profit
- Total Units Sold
- Inventory Turnover
- Stockout Risk %
- Overstock %
- Average Monthly Demand
- Forecast Accuracy

Visuals:

- Line chart: monthly revenue and profit trend
- KPI variance cards: revenue MoM %, profit MoM %, stockout risk vs 15% target, overstock vs 20% target
- Bar chart: revenue by region
- Donut or stacked bar: inventory recommendation mix
- Insight text box with 3-5 business callouts

## Page 2: Sales & Demand Analytics

Purpose: explain where demand and profitability are coming from.

Visuals:

- Line chart: revenue trend by month
- Area chart: demand units by month
- Bar chart: category revenue and profit margin
- Map visual: regional sales performance
- Matrix: SKU/product demand by region
- Top N bar chart: top selling products
- Drill-through target: product detail page filtered by SKU

Slicers:

- Date
- Region
- Product Category
- Customer Segment
- SKU

## Page 3: Inventory Optimization

Purpose: convert demand signals into replenishment decisions.

Visuals:

- KPI cards: inventory value, stockout risk %, overstock %, average lead time
- Bar chart: SKU count by inventory status
- Table: restock recommendations with SKU, product, region, inventory level, reorder point, lead time
- Scatter plot: average monthly demand vs inventory level, colored by velocity class
- Matrix: warehouse and region inventory exposure
- Conditional formatting: red for below reorder point, amber for above max stock, green for within policy

Recommendation labels:

- Restock Recommended
- Excess Inventory
- High Demand SKU
- Maintain

## Page 4: Forecasting

Purpose: show a simple, business-friendly demand forecast.

Beginner Power BI option:

- Use monthly demand line chart
- Open the Analytics pane
- Add forecast with 6-month horizon
- Set confidence interval to 80-95%
- Explain that this is an operational forecast, not an advanced ML model

Python option:

- Group sales by month, category, and region
- Calculate a 3-month moving average
- Add a light seasonal adjustment
- Export to `forecast_simple.csv`

Visuals:

- Line chart: actual demand and forecast demand
- Line chart: forecast sales by category
- Table: category-region forecast output
- KPI: forecast accuracy placeholder or future backtest result

## Design System

- Canvas: 16:9 widescreen
- Palette: navy `#17324D`, blue `#2F80ED`, teal `#00A88F`, amber `#F2C94C`, red `#D64545`, light background `#F7F9FC`
- Font: Segoe UI or Aptos
- Card style: light background, subtle border, compact title, large KPI value
- Layout: one row of KPI cards, two-column visual grid, slicers in a left or top filter rail
- Keep labels short and business-oriented
