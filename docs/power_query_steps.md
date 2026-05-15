# Power Query Cleaning Steps

Use **Get Data > Text/CSV** to import:

- `data/processed/sales_clean.csv`
- `data/processed/inventory_clean.csv`
- `data/processed/monthly_demand.csv`
- `data/processed/forecast_simple.csv`

## Sales Table: `Fact_Sales`

Suggested Power Query transformations:

```powerquery
let
    Source = Csv.Document(File.Contents("data/processed/sales_clean.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    ChangedTypes = Table.TransformColumnTypes(PromotedHeaders, {
        {"Order_ID", type text},
        {"Order_Date", type date},
        {"Month", type date},
        {"Quarter", type text},
        {"Product", type text},
        {"SKU", type text},
        {"Category", type text},
        {"Subcategory", type text},
        {"Region", type text},
        {"Customer_Segment", type text},
        {"Sales", Currency.Type},
        {"Profit", Currency.Type},
        {"Quantity", Int64.Type},
        {"Discount", Percentage.Type},
        {"Unit_Price", Currency.Type},
        {"Shipping_Cost", Currency.Type},
        {"Profit_Margin", Percentage.Type}
    }),
    TrimmedText = Table.TransformColumns(ChangedTypes, {
        {"Product", Text.Trim, type text},
        {"Category", Text.Proper, type text},
        {"Subcategory", Text.Proper, type text},
        {"Region", Text.Proper, type text},
        {"Customer_Segment", Text.Proper, type text}
    }),
    RemovedDuplicates = Table.Distinct(TrimmedText, {"Order_ID", "Order_Date", "SKU", "Sales", "Quantity"}),
    ReplacedMissing = Table.ReplaceValue(RemovedDuplicates, null, "Unknown", Replacer.ReplaceValue, {"Region", "Customer_Segment"}),
    FilteredValidRows = Table.SelectRows(ReplacedMissing, each [Sales] >= 0 and [Quantity] > 0)
in
    FilteredValidRows
```

## Inventory Table: `Fact_Inventory`

```powerquery
let
    Source = Csv.Document(File.Contents("data/processed/inventory_clean.csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    ChangedTypes = Table.TransformColumnTypes(PromotedHeaders, {
        {"SKU", type text},
        {"Product", type text},
        {"Category", type text},
        {"Region", type text},
        {"Warehouse", type text},
        {"Supplier", type text},
        {"Inventory_Level", Int64.Type},
        {"Reorder_Point", Int64.Type},
        {"Safety_Stock", Int64.Type},
        {"Supplier_Lead_Time_Days", Int64.Type},
        {"Average_Monthly_Demand", type number},
        {"Demand_Std_Dev", type number},
        {"Max_Stock_Level", Int64.Type},
        {"Inventory_Value", Currency.Type},
        {"Velocity_Class", type text},
        {"Inventory_Status", type text},
        {"Stockout_Risk_Flag", type text},
        {"Overstock_Flag", type text}
    }),
    RemovedDuplicates = Table.Distinct(ChangedTypes, {"SKU", "Region", "Warehouse"}),
    ValidatedInventory = Table.SelectRows(RemovedDuplicates, each
        [Inventory_Level] >= 0 and
        [Reorder_Point] >= 0 and
        [Safety_Stock] >= 0 and
        [Supplier_Lead_Time_Days] > 0
    ),
    AddedValidationFlag = Table.AddColumn(ValidatedInventory, "Inventory_Validation", each
        if [Inventory_Level] <= [Reorder_Point] then "Below Reorder Point"
        else if [Inventory_Level] > [Max_Stock_Level] then "Above Max Stock"
        else "Within Policy", type text
    )
in
    AddedValidationFlag
```

## Recommended Model

- Create a `Date` table in Power BI and mark it as the date table.
- Connect `Date[Date]` to `Fact_Sales[Order_Date]`.
- Connect `Date[Month]` to `Monthly_Demand[Month]` and `Forecast[Forecast_Month]`.
- Connect `Fact_Sales[SKU]` to `Fact_Inventory[SKU]`.
- If SKU-region analysis becomes ambiguous, create a bridge key: `SKU & "-" & Region`.
