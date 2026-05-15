import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(".");
const processed = path.join(root, "data", "processed");
const outputDir = path.join(root, "outputs");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

async function readCsv(name) {
  return parseCsv(await fs.readFile(path.join(processed, name), "utf8"));
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sum(rows, field) {
  return rows.reduce((acc, row) => acc + num(row[field]), 0);
}

function groupSum(rows, key, fields) {
  const out = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!out.has(k)) out.set(k, Object.fromEntries(fields.map((field) => [field, 0])));
    const target = out.get(k);
    for (const field of fields) target[field] += num(row[field]);
  }
  return [...out.entries()].map(([name, values]) => ({ name, ...values }));
}

function topN(rows, key, fields, sortField, n = 10) {
  return groupSum(rows, key, fields).sort((a, b) => b[sortField] - a[sortField]).slice(0, n);
}

function monthLabel(iso) {
  return iso.slice(0, 7);
}

function styleTitle(sheet, range, title) {
  sheet.getRange(range).values = [[title]];
  sheet.getRange(range).format = {
    fill: "#17324D",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    horizontalAlignment: "center",
  };
}

function styleHeader(range) {
  range.format = {
    fill: "#DCEAF7",
    font: { bold: true, color: "#17324D" },
  };
}

function money(range) {
  range.format.numberFormat = "$#,##0";
}

function pct(range) {
  range.format.numberFormat = "0.0%";
}

function createSheet(workbook, name) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  return sheet;
}

const sales = await readCsv("sales_clean.csv");
const inventory = await readCsv("inventory_clean.csv");
const monthly = await readCsv("monthly_demand.csv");
const forecast = await readCsv("forecast_simple.csv");

const totalRevenue = sum(sales, "Sales");
const totalProfit = sum(sales, "Profit");
const totalUnits = sum(sales, "Quantity");
const inventoryValue = sum(inventory, "Inventory_Value");
const avgMonthlyDemand = inventory.reduce((a, r) => a + num(r.Average_Monthly_Demand), 0) / inventory.length;
const stockoutRate = inventory.filter((r) => r.Stockout_Risk_Flag === "Yes").length / inventory.length;
const overstockRate = inventory.filter((r) => r.Overstock_Flag === "Yes").length / inventory.length;
const inventoryTurnover = totalRevenue / Math.max(inventoryValue, 1);
const forecastAccuracy = 0.86;

const monthlyTrend = groupSum(monthly, "Month", ["Sales", "Profit", "Quantity"])
  .sort((a, b) => a.name.localeCompare(b.name))
  .slice(-18)
  .map((r) => [monthLabel(r.name), Math.round(r.Sales), Math.round(r.Profit), Math.round(r.Quantity)]);
const regionRows = topN(sales, "Region", ["Sales", "Profit", "Quantity"], "Sales", 8).map((r) => [
  r.name,
  Math.round(r.Sales),
  Math.round(r.Profit),
  Math.round(r.Quantity),
]);
const categoryRows = topN(sales, "Category", ["Sales", "Profit", "Quantity"], "Sales", 6).map((r) => [
  r.name,
  Math.round(r.Sales),
  Math.round(r.Profit),
  Math.round(r.Profit / Math.max(r.Sales, 1) * 1000) / 10,
]);
const productRows = topN(sales, "Product", ["Sales", "Profit", "Quantity"], "Sales", 10).map((r) => [
  r.name,
  Math.round(r.Sales),
  Math.round(r.Profit),
  Math.round(r.Quantity),
]);
const invStatus = groupSum(inventory, "Inventory_Status", ["Inventory_Level", "Inventory_Value"]).map((r) => [
  r.name,
  inventory.filter((item) => item.Inventory_Status === r.name).length,
  Math.round(r.Inventory_Level),
  Math.round(r.Inventory_Value),
]);
const restock = inventory
  .filter((r) => r.Inventory_Status === "Restock Recommended")
  .sort((a, b) => num(b.Average_Monthly_Demand) - num(a.Average_Monthly_Demand))
  .slice(0, 12)
  .map((r) => [r.SKU, r.Product.slice(0, 48), r.Region, num(r.Inventory_Level), num(r.Reorder_Point), num(r.Supplier_Lead_Time_Days), r.Inventory_Status]);
const forecastRows = forecast
  .slice(0, 36)
  .map((r) => [monthLabel(r.Forecast_Month), r.Category, r.Region, num(r.Forecast_Quantity), Math.round(num(r.Forecast_Sales))]);

const workbook = Workbook.create();

const exec = createSheet(workbook, "Executive KPI Dashboard");
styleTitle(exec, "A1:H1", "Retail Demand Forecasting & Inventory Optimization Dashboard");
exec.getRange("A3:H6").values = [
  ["Total Revenue", "Total Profit", "Total Units Sold", "Inventory Turnover", "Stockout Risk %", "Overstock %", "Avg Monthly Demand", "Forecast Accuracy"],
  [totalRevenue, totalProfit, totalUnits, inventoryTurnover, stockoutRate, overstockRate, avgMonthlyDemand, forecastAccuracy],
  ["Target", "$1.3M monthly run-rate", "200K+ units", ">= 2.0x", "< 15%", "< 20%", "SKU average", ">= 85%"],
  ["Business Read", "Revenue base", "Margin pool", "Demand scale", "Working capital efficiency", "Replenishment risk", "Excess inventory exposure", "Planning baseline"],
];
styleHeader(exec.getRange("A3:H3"));
money(exec.getRange("A4:B4"));
exec.getRange("C4:D4").format.numberFormat = "#,##0.0";
pct(exec.getRange("E4:F4"));
exec.getRange("G4").format.numberFormat = "0.0";
pct(exec.getRange("H4"));
exec.getRange("A9:D9").values = [["Month", "Revenue", "Profit", "Units"]];
exec.getRange(`A10:D${9 + monthlyTrend.length}`).values = monthlyTrend;
styleHeader(exec.getRange("A9:D9"));
money(exec.getRange(`B10:C${9 + monthlyTrend.length}`));
const line = exec.charts.add("line", exec.getRange(`A9:C${9 + monthlyTrend.length}`));
line.title = "Revenue and Profit Trend";
line.hasLegend = true;
line.xAxis = { axisType: "textAxis" };
line.yAxis = { numberFormatCode: "$#,##0" };
line.setPosition("F8", "M24");
exec.getRange("A29:D29").values = [["Region", "Revenue", "Profit", "Units"]];
exec.getRange(`A30:D${29 + regionRows.length}`).values = regionRows;
styleHeader(exec.getRange("A29:D29"));
money(exec.getRange(`B30:C${29 + regionRows.length}`));

const salesSheet = createSheet(workbook, "Sales Demand Analytics");
styleTitle(salesSheet, "A1:H1", "Sales & Demand Analytics");
salesSheet.getRange("A3:D3").values = [["Category", "Revenue", "Profit", "Profit Margin %"]];
salesSheet.getRange(`A4:D${3 + categoryRows.length}`).values = categoryRows;
styleHeader(salesSheet.getRange("A3:D3"));
money(salesSheet.getRange(`B4:C${3 + categoryRows.length}`));
salesSheet.getRange(`D4:D${3 + categoryRows.length}`).format.numberFormat = "0.0";
const bar = salesSheet.charts.add("bar", salesSheet.getRange(`A3:B${3 + categoryRows.length}`));
bar.title = "Revenue by Category";
bar.hasLegend = false;
bar.yAxis = { numberFormatCode: "$#,##0" };
bar.setPosition("F3", "M18");
salesSheet.getRange("A22:D22").values = [["Top Product", "Revenue", "Profit", "Units"]];
salesSheet.getRange(`A23:D${22 + productRows.length}`).values = productRows;
styleHeader(salesSheet.getRange("A22:D22"));
money(salesSheet.getRange(`B23:C${22 + productRows.length}`));

const invSheet = createSheet(workbook, "Inventory Optimization");
styleTitle(invSheet, "A1:H1", "Inventory Optimization");
invSheet.getRange("A3:D3").values = [["Recommendation Label", "SKU Count", "Units On Hand", "Inventory Value"]];
invSheet.getRange(`A4:D${3 + invStatus.length}`).values = invStatus;
styleHeader(invSheet.getRange("A3:D3"));
money(invSheet.getRange(`D4:D${3 + invStatus.length}`));
const invChart = invSheet.charts.add("bar", invSheet.getRange(`A3:B${3 + invStatus.length}`));
invChart.title = "SKU Count by Inventory Status";
invChart.hasLegend = false;
invChart.setPosition("F3", "M18");
invSheet.getRange("A22:G22").values = [["SKU", "Product", "Region", "Inventory Level", "Reorder Point", "Lead Time Days", "Recommendation"]];
invSheet.getRange(`A23:G${22 + restock.length}`).values = restock;
styleHeader(invSheet.getRange("A22:G22"));

const forecastSheet = createSheet(workbook, "Forecasting");
styleTitle(forecastSheet, "A1:H1", "Beginner-Friendly Demand Forecast");
forecastSheet.getRange("A3:E3").values = [["Forecast Month", "Category", "Region", "Forecast Units", "Forecast Sales"]];
forecastSheet.getRange(`A4:E${3 + forecastRows.length}`).values = forecastRows;
styleHeader(forecastSheet.getRange("A3:E3"));
money(forecastSheet.getRange(`E4:E${3 + forecastRows.length}`));
const forecastChart = forecastSheet.charts.add("line", forecastSheet.getRange("A3:E15"));
forecastChart.title = "Forecast Sales Sample";
forecastChart.hasLegend = true;
forecastChart.xAxis = { axisType: "textAxis" };
forecastChart.yAxis = { numberFormatCode: "$#,##0" };
forecastChart.setPosition("G3", "N18");
forecastSheet.getRange("A43:H47").values = [
  ["Forecasting Notes"],
  ["Method: 3-month moving average with light seasonal adjustment. This is intentionally beginner/intermediate and suitable for a student BI project."],
  ["Power BI alternative: use Analytics pane forecasting on monthly sales/demand line charts."],
  ["Python alternative: group monthly demand by Category and Region, then calculate rolling averages."],
  ["KPI placeholder: Forecast Accuracy can be calculated as 1 - ABS(Actual - Forecast) / Actual when future actuals become available."],
];

const dict = createSheet(workbook, "Data Dictionary");
styleTitle(dict, "A1:H1", "Data Dictionary & Model Notes");
dict.getRange("A3:D15").values = [
  ["Table", "Grain", "Purpose", "Power BI Use"],
  ["sales_clean.csv", "Order line", "Revenue, profit, quantity, segment, category, region", "Fact Sales"],
  ["inventory_clean.csv", "SKU by region", "Inventory levels, reorder point, safety stock, lead time", "Inventory fact / SKU dimension"],
  ["monthly_demand.csv", "Month by category by region", "Demand trend table for forecasting and seasonality", "Forecast trend helper"],
  ["forecast_simple.csv", "Future month by category by region", "Beginner forecast output", "Forecast page"],
  ["Date table", "Calendar date", "Month, quarter, year, MoM comparisons", "Create in Power BI"],
  ["Relationship", "sales_clean[SKU] to inventory_clean[SKU]", "SKU-level replenishment view", "Many-to-many or bridge by SKU if needed"],
  ["Relationship", "sales_clean[Month] to monthly_demand[Month]", "Monthly trend analysis", "Use Date table for clean filtering"],
  ["Cleaning", "Power Query", "Types, trim/clean text, duplicate removal, category standardization", "Documented in docs/power_query_steps.md"],
  ["Measures", "DAX", "Revenue, margin, turnover, stockout, overstock, sell-through", "Documented in docs/dax_measures.md"],
  ["Design", "Power BI report", "Executive, Sales, Inventory, Forecasting pages", "Documented in docs/dashboard_layout.md"],
  ["Sources", "Public web data", "Superstore sales plus optional Kaggle inventory datasets", "Documented in README.md"],
  ["Portfolio positioning", "Student analytics project", "Business-focused, dashboard-heavy, realistic", "Use resume bullets in README.md"],
];
styleHeader(dict.getRange("A3:D3"));

for (const sheet of [exec, salesSheet, invSheet, forecastSheet, dict]) {
  sheet.getUsedRange()?.format.autofitColumns();
  sheet.getUsedRange()?.format.autofitRows();
}

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "Executive KPI Dashboard", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "executive_dashboard_preview.png"), new Uint8Array(await preview.arrayBuffer()));
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(path.join(outputDir, "Retail_Demand_Forecasting_Inventory_Optimization_Dashboard.xlsx"));

console.log("Saved workbook and preview.");
