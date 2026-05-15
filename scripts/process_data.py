from __future__ import annotations

import csv
import hashlib
import math
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "superstore_sales_raw.csv"
PROCESSED = ROOT / "data" / "processed"


def clean_text(value: str) -> str:
    return " ".join((value or "").strip().split())


def sku_for(product_name: str) -> str:
    digest = hashlib.md5(product_name.encode("utf-8")).hexdigest()[:6].upper()
    return f"SKU-{digest}"


def parse_float(value: str) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def parse_int(value: str) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def parse_date(value: str) -> datetime:
    return datetime.strptime(value.strip(), "%m/%d/%Y")


def month_start(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}-01"


def quarter_label(dt: datetime) -> str:
    return f"{dt.year} Q{((dt.month - 1) // 3) + 1}"


def read_sales() -> list[dict[str, object]]:
    seen = set()
    rows: list[dict[str, object]] = []
    with RAW.open("r", encoding="cp1252", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            row_id = clean_text(raw.get("Row ID", ""))
            order_id = clean_text(raw.get("Order ID", ""))
            product = clean_text(raw.get("Product Name", "Unknown Product"))
            order_date = parse_date(raw["Order Date"])
            dedupe_key = (row_id, order_id, product)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            category = clean_text(raw.get("Product Category", "Uncategorized")).title()
            subcategory = clean_text(raw.get("Product Sub-Category", "Uncategorized")).title()
            region = clean_text(raw.get("Region", "Unknown")).title()
            segment = clean_text(raw.get("Customer Segment", "Unknown")).title()
            quantity = parse_int(raw.get("Order Quantity", "0"))
            sales = parse_float(raw.get("Sales", "0"))
            profit = parse_float(raw.get("Profit", "0"))
            discount = parse_float(raw.get("Discount", "0"))
            unit_price = parse_float(raw.get("Unit Price", "0"))
            shipping_cost = parse_float(raw.get("Shipping Cost", "0"))
            profit_margin = round(profit / sales, 4) if sales else 0

            rows.append(
                {
                    "Order_ID": order_id,
                    "Order_Date": order_date.strftime("%Y-%m-%d"),
                    "Month": month_start(order_date),
                    "Quarter": quarter_label(order_date),
                    "Product": product,
                    "SKU": sku_for(product),
                    "Category": category,
                    "Subcategory": subcategory,
                    "Region": region,
                    "Customer_Segment": segment,
                    "Sales": sales,
                    "Profit": profit,
                    "Quantity": quantity,
                    "Discount": discount,
                    "Unit_Price": unit_price,
                    "Shipping_Cost": shipping_cost,
                    "Profit_Margin": profit_margin,
                }
            )
    return rows


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_inventory(sales_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    rng = random.Random(42)
    demand_by_sku_region: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for row in sales_rows:
        demand_by_sku_region[(str(row["SKU"]), str(row["Region"]))].append(row)

    warehouses = {
        "Atlantic": "WH-East",
        "Northwest Territories": "WH-West",
        "Nunavut": "WH-North",
        "Ontario": "WH-Central",
        "Prarie": "WH-Central",
        "Quebec": "WH-East",
        "West": "WH-West",
        "Yukon": "WH-North",
    }
    suppliers = ["NorthBridge Supply", "Meridian Retail Co.", "PrimeSource Direct", "Atlas Wholesale"]
    inventory_rows: list[dict[str, object]] = []

    for (sku, region), rows in sorted(demand_by_sku_region.items()):
        total_units = sum(int(r["Quantity"]) for r in rows)
        total_sales = sum(float(r["Sales"]) for r in rows)
        avg_monthly_demand = total_units / 48
        demand_std = max(1.0, math.sqrt(max(total_units, 1)) / 2)
        lead_time = rng.randint(5, 21)
        safety_stock = max(3, math.ceil(1.65 * demand_std * math.sqrt(lead_time / 30)))
        reorder_point = math.ceil((avg_monthly_demand / 30 * lead_time) + safety_stock)
        cycle_stock = max(4, math.ceil(avg_monthly_demand * rng.uniform(0.8, 2.6)))
        current_inventory = max(0, reorder_point + cycle_stock + rng.randint(-15, 24))
        max_stock = max(reorder_point + 18, math.ceil(reorder_point + avg_monthly_demand * 3.0))
        stockout_risk = current_inventory <= reorder_point
        overstock = current_inventory > max_stock
        velocity = "Fast-moving" if avg_monthly_demand >= 8 else "Slow-moving" if avg_monthly_demand < 3 else "Medium-moving"
        recommendation = (
            "Restock Recommended"
            if stockout_risk
            else "Excess Inventory"
            if overstock
            else "High Demand SKU"
            if velocity == "Fast-moving"
            else "Maintain"
        )

        first = rows[0]
        inventory_rows.append(
            {
                "SKU": sku,
                "Product": first["Product"],
                "Category": first["Category"],
                "Region": region,
                "Warehouse": warehouses.get(region, "WH-Central"),
                "Supplier": rng.choice(suppliers),
                "Inventory_Level": current_inventory,
                "Reorder_Point": reorder_point,
                "Safety_Stock": safety_stock,
                "Supplier_Lead_Time_Days": lead_time,
                "Average_Monthly_Demand": round(avg_monthly_demand, 2),
                "Demand_Std_Dev": round(demand_std, 2),
                "Max_Stock_Level": max_stock,
                "Inventory_Value": round(current_inventory * max(total_sales / max(total_units, 1), 1), 2),
                "Velocity_Class": velocity,
                "Inventory_Status": recommendation,
                "Stockout_Risk_Flag": "Yes" if stockout_risk else "No",
                "Overstock_Flag": "Yes" if overstock else "No",
            }
        )
    return inventory_rows


def build_monthly_demand(sales_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str, str], dict[str, float]] = defaultdict(lambda: {"Sales": 0.0, "Profit": 0.0, "Quantity": 0.0})
    for row in sales_rows:
        key = (str(row["Month"]), str(row["Category"]), str(row["Region"]))
        grouped[key]["Sales"] += float(row["Sales"])
        grouped[key]["Profit"] += float(row["Profit"])
        grouped[key]["Quantity"] += int(row["Quantity"])

    output = []
    for (month, category, region), values in sorted(grouped.items()):
        output.append(
            {
                "Month": month,
                "Category": category,
                "Region": region,
                "Sales": round(values["Sales"], 2),
                "Profit": round(values["Profit"], 2),
                "Quantity": int(values["Quantity"]),
            }
        )
    return output


def build_forecast(monthly_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    by_category_region: dict[tuple[str, str], list[dict[str, object]]] = defaultdict(list)
    for row in monthly_rows:
        by_category_region[(str(row["Category"]), str(row["Region"]))].append(row)

    forecast_rows: list[dict[str, object]] = []
    for (category, region), rows in by_category_region.items():
        rows = sorted(rows, key=lambda r: str(r["Month"]))
        last_actuals = rows[-6:]
        actual_next_proxy = [float(r["Quantity"]) for r in rows[-3:]]
        moving_avg = sum(actual_next_proxy) / max(len(actual_next_proxy), 1)
        seasonal_factor = 1.0 + ((sum(float(r["Quantity"]) for r in last_actuals[-3:]) / max(sum(float(r["Quantity"]) for r in last_actuals[:3]), 1)) - 1.0) * 0.25
        last_month = datetime.strptime(str(rows[-1]["Month"]), "%Y-%m-%d")
        for i in range(1, 7):
            month_num = last_month.month + i
            year = last_month.year + (month_num - 1) // 12
            month = ((month_num - 1) % 12) + 1
            forecast_qty = max(0, round(moving_avg * seasonal_factor * (1 + 0.015 * i), 0))
            forecast_sales = round(forecast_qty * (sum(float(r["Sales"]) for r in last_actuals) / max(sum(float(r["Quantity"]) for r in last_actuals), 1)), 2)
            forecast_rows.append(
                {
                    "Forecast_Month": f"{year:04d}-{month:02d}-01",
                    "Category": category,
                    "Region": region,
                    "Forecast_Quantity": int(forecast_qty),
                    "Forecast_Sales": forecast_sales,
                    "Method": "3-month moving average with seasonal adjustment",
                }
            )
    return forecast_rows


def main() -> None:
    sales = read_sales()
    inventory = build_inventory(sales)
    monthly = build_monthly_demand(sales)
    forecast = build_forecast(monthly)

    write_csv(
        PROCESSED / "sales_clean.csv",
        sales,
        [
            "Order_ID",
            "Order_Date",
            "Month",
            "Quarter",
            "Product",
            "SKU",
            "Category",
            "Subcategory",
            "Region",
            "Customer_Segment",
            "Sales",
            "Profit",
            "Quantity",
            "Discount",
            "Unit_Price",
            "Shipping_Cost",
            "Profit_Margin",
        ],
    )
    write_csv(
        PROCESSED / "inventory_clean.csv",
        inventory,
        [
            "SKU",
            "Product",
            "Category",
            "Region",
            "Warehouse",
            "Supplier",
            "Inventory_Level",
            "Reorder_Point",
            "Safety_Stock",
            "Supplier_Lead_Time_Days",
            "Average_Monthly_Demand",
            "Demand_Std_Dev",
            "Max_Stock_Level",
            "Inventory_Value",
            "Velocity_Class",
            "Inventory_Status",
            "Stockout_Risk_Flag",
            "Overstock_Flag",
        ],
    )
    write_csv(PROCESSED / "monthly_demand.csv", monthly, ["Month", "Category", "Region", "Sales", "Profit", "Quantity"])
    write_csv(
        PROCESSED / "forecast_simple.csv",
        forecast,
        ["Forecast_Month", "Category", "Region", "Forecast_Quantity", "Forecast_Sales", "Method"],
    )

    print(f"sales_clean rows: {len(sales)}")
    print(f"inventory_clean rows: {len(inventory)}")
    print(f"monthly_demand rows: {len(monthly)}")
    print(f"forecast rows: {len(forecast)}")


if __name__ == "__main__":
    main()
