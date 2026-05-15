# Commented DAX Measures

Create these measures in Power BI. The comments are included so reviewers can quickly understand the business logic.

```DAX
Total Revenue =
// Total sales generated from all retail order lines.
SUM ( Fact_Sales[Sales] )

Total Profit =
// Net profit after discounts, product cost, and shipping impact in the source data.
SUM ( Fact_Sales[Profit] )

Total Units Sold =
// Total demand volume sold to customers.
SUM ( Fact_Sales[Quantity] )

Profit Margin % =
// Profitability as a percentage of revenue.
DIVIDE ( [Total Profit], [Total Revenue] )

Average Monthly Demand =
// Average SKU-region demand baseline used for replenishment planning.
AVERAGE ( Fact_Inventory[Average_Monthly_Demand] )

Inventory Value =
// Current value of on-hand inventory.
SUM ( Fact_Inventory[Inventory_Value] )

Inventory Turnover =
// Revenue generated per dollar of inventory value.
DIVIDE ( [Total Revenue], [Inventory Value] )

Stockout SKU Count =
// SKUs currently at or below reorder point.
CALCULATE (
    DISTINCTCOUNT ( Fact_Inventory[SKU] ),
    Fact_Inventory[Stockout_Risk_Flag] = "Yes"
)

Stockout Risk % =
// Share of SKU-region records with potential stockout exposure.
DIVIDE (
    CALCULATE ( COUNTROWS ( Fact_Inventory ), Fact_Inventory[Stockout_Risk_Flag] = "Yes" ),
    COUNTROWS ( Fact_Inventory )
)

Overstock SKU Count =
// SKUs above the recommended maximum stock level.
CALCULATE (
    DISTINCTCOUNT ( Fact_Inventory[SKU] ),
    Fact_Inventory[Overstock_Flag] = "Yes"
)

Overstock % =
// Share of SKU-region records carrying excess inventory.
DIVIDE (
    CALCULATE ( COUNTROWS ( Fact_Inventory ), Fact_Inventory[Overstock_Flag] = "Yes" ),
    COUNTROWS ( Fact_Inventory )
)

Sell-through Rate =
// Units sold relative to units sold plus current inventory.
DIVIDE (
    [Total Units Sold],
    [Total Units Sold] + SUM ( Fact_Inventory[Inventory_Level] )
)

Reorder Threshold =
// Average reorder point visible under current slicer selections.
AVERAGE ( Fact_Inventory[Reorder_Point] )

Forecast Sales =
// Expected sales from the simple forecast table.
SUM ( Forecast[Forecast_Sales] )

Forecast Units =
// Expected future demand units from the simple forecast table.
SUM ( Forecast[Forecast_Quantity] )

Forecast Variance =
// Difference between actual revenue and forecast revenue.
[Total Revenue] - [Forecast Sales]

Forecast Accuracy =
// Accuracy proxy. Use this once actual future demand is available.
1 - DIVIDE ( ABS ( [Total Revenue] - [Forecast Sales] ), [Total Revenue] )

Revenue MoM % =
// Month-over-month revenue movement for KPI variance cards.
VAR CurrentRevenue = [Total Revenue]
VAR PriorRevenue =
    CALCULATE ( [Total Revenue], DATEADD ( 'Date'[Date], -1, MONTH ) )
RETURN
    DIVIDE ( CurrentRevenue - PriorRevenue, PriorRevenue )

Profit MoM % =
// Month-over-month profit movement for executive reporting.
VAR CurrentProfit = [Total Profit]
VAR PriorProfit =
    CALCULATE ( [Total Profit], DATEADD ( 'Date'[Date], -1, MONTH ) )
RETURN
    DIVIDE ( CurrentProfit - PriorProfit, PriorProfit )
```

## Calculated Column Option

```DAX
Replenishment Recommendation =
// Label each SKU-region record for operational action.
SWITCH (
    TRUE (),
    Fact_Inventory[Inventory_Level] <= Fact_Inventory[Reorder_Point], "Restock Recommended",
    Fact_Inventory[Inventory_Level] > Fact_Inventory[Max_Stock_Level], "Excess Inventory",
    Fact_Inventory[Velocity_Class] = "Fast-moving", "High Demand SKU",
    "Maintain"
)
```
