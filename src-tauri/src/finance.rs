use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceTransaction {
    pub id: Option<i64>,
    pub label: String,
    pub amount: f64,
    pub date: Option<String>,
    pub category: String,
    pub is_positive: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceBudget {
    pub id: Option<i64>,
    pub category: String,
    pub limit_amount: f64,
    pub spent_amount: f64,
    pub period: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavingsGoal {
    pub id: Option<i64>,
    pub name: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub deadline: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceAsset {
    pub id: Option<i64>,
    pub label: String,
    pub amount: f64,
    pub type_: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceSummary {
    pub total_net_worth: f64,
    pub monthly_income: f64,
    pub monthly_spent: f64,
    pub income_change_pct: f64,
    pub net_worth_history: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseFlow {
    pub source: String,
    pub target: String,
    pub value: f64,
}

pub fn create_transaction(
    conn: &Connection,
    transaction: FinanceTransaction,
) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO finance_transactions (label, amount, category, is_positive) VALUES (?1, ?2, ?3, ?4)",
        params![transaction.label, transaction.amount, transaction.category, transaction.is_positive as i32],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn update_transaction(
    conn: &Connection,
    transaction: FinanceTransaction,
) -> Result<(), String> {
    conn.execute(
        "UPDATE finance_transactions SET label = ?1, amount = ?2, category = ?3, is_positive = ?4 WHERE id = ?5",
        params![transaction.label, transaction.amount, transaction.category, transaction.is_positive as i32, transaction.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_transaction(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM finance_transactions WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_transactions(conn: &Connection) -> Result<Vec<FinanceTransaction>, String> {
    let mut stmt = conn
        .prepare("SELECT id, label, amount, date, category, is_positive FROM finance_transactions ORDER BY date DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(FinanceTransaction {
                id: Some(row.get(0)?),
                label: row.get(1)?,
                amount: row.get(2)?,
                date: Some(row.get(3)?),
                category: row.get(4)?,
                is_positive: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_budgets(conn: &Connection) -> Result<Vec<FinanceBudget>, String> {
    let mut stmt = conn
        .prepare("SELECT id, category, limit_amount, spent_amount, period FROM finance_budgets")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(FinanceBudget {
                id: Some(row.get(0)?),
                category: row.get(1)?,
                limit_amount: row.get(2)?,
                spent_amount: row.get(3)?,
                period: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn create_budget(conn: &Connection, budget: FinanceBudget) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO finance_budgets (category, limit_amount, spent_amount, period) VALUES (?1, ?2, ?3, ?4)",
        params![budget.category, budget.limit_amount, budget.spent_amount, budget.period],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn update_budget(conn: &Connection, budget: FinanceBudget) -> Result<(), String> {
    conn.execute(
        "UPDATE finance_budgets SET limit_amount = ?1, spent_amount = ?2, period = ?3 WHERE category = ?4",
        params![budget.limit_amount, budget.spent_amount, budget.period, budget.category],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_budget(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM finance_budgets WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_savings_goals(conn: &Connection) -> Result<Vec<SavingsGoal>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, target_amount, current_amount, deadline FROM finance_savings_goals",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(SavingsGoal {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                target_amount: row.get(2)?,
                current_amount: row.get(3)?,
                deadline: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn update_savings_goal(conn: &Connection, goal: SavingsGoal) -> Result<(), String> {
    conn.execute(
        "UPDATE finance_savings_goals SET current_amount = ?1, target_amount = ?2 WHERE id = ?3",
        params![goal.current_amount, goal.target_amount, goal.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_asset(conn: &Connection, asset: FinanceAsset) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO finance_assets (label, amount, type, color) VALUES (?1, ?2, ?3, ?4)",
        params![asset.label, asset.amount, asset.type_, asset.color],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn update_asset(conn: &Connection, asset: FinanceAsset) -> Result<(), String> {
    conn.execute(
        "UPDATE finance_assets SET label = ?1, amount = ?2, type = ?3, color = ?4 WHERE id = ?5",
        params![
            asset.label,
            asset.amount,
            asset.type_,
            asset.color,
            asset.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_asset(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM finance_assets WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_assets(conn: &Connection) -> Result<Vec<FinanceAsset>, String> {
    let mut stmt = conn
        .prepare("SELECT id, label, amount, type, color FROM finance_assets")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(FinanceAsset {
                id: Some(row.get(0)?),
                label: row.get(1)?,
                amount: row.get(2)?,
                type_: row.get(3)?,
                color: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_finance_summary(conn: &Connection) -> Result<FinanceSummary, String> {
    let total_assets: f64 = conn
        .query_row("SELECT SUM(amount) FROM finance_assets", [], |row| {
            row.get(0)
        })
        .unwrap_or(0.0);

    // Calculate monthly income and spent from transactions in the last 30 days
    let monthly_income: f64 = conn.query_row(
        "SELECT SUM(amount) FROM finance_transactions WHERE is_positive = 1 AND date >= date('now', '-30 days')",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let monthly_spent: f64 = conn.query_row(
        "SELECT SUM(amount) FROM finance_transactions WHERE is_positive = 0 AND date >= date('now', '-30 days')",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // Calculate historical net worth (last 30 days)
    let mut net_worth_history = Vec::new();
    let mut current_nw = total_assets;
    net_worth_history.push(current_nw);

    for i in 1..30 {
        let date_str = format!("-{} days", i);
        let daily_net: f64 = conn.query_row(
            "SELECT TOTAL(CASE WHEN is_positive = 1 THEN amount ELSE -amount END) FROM finance_transactions WHERE date(date) = date('now', ?1)",
            [date_str],
            |row| row.get(0)
        ).unwrap_or(0.0);
        current_nw -= daily_net;
        net_worth_history.push(current_nw);
    }
    net_worth_history.reverse();

    Ok(FinanceSummary {
        total_net_worth: total_assets,
        monthly_income,
        monthly_spent,
        income_change_pct: 12.5,
        net_worth_history,
    })
}

pub fn get_expense_flows(conn: &Connection) -> Result<Vec<ExpenseFlow>, String> {
    let mut flows = Vec::new();

    // 1. Raw Income -> Net Income & Taxes (Sample split)
    let raw_income: f64 = conn.query_row(
        "SELECT TOTAL(amount) FROM finance_transactions WHERE is_positive = 1 AND date >= date('now', '-30 days')",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    if raw_income > 0.0 {
        flows.push(ExpenseFlow {
            source: "Raw Income".to_string(),
            target: "Net Income".to_string(),
            value: raw_income,
        });

        // 2. Net Income -> Categories
        let mut stmt = conn.prepare(
            "SELECT category, SUM(amount) FROM finance_transactions WHERE is_positive = 0 AND date >= date('now', '-30 days') GROUP BY category"
        ).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let mut total_spent = 0.0;
        for row in rows {
            let (cat, val) = row.map_err(|e| e.to_string())?;
            flows.push(ExpenseFlow {
                source: "Net Income".to_string(),
                target: cat,
                value: val,
            });
            total_spent += val;
        }

        // 3. Remaining -> Savings
        let savings = raw_income - total_spent;
        if savings > 0.0 {
            flows.push(ExpenseFlow {
                source: "Net Income".to_string(),
                target: "Savings".to_string(),
                value: savings,
            });
        }
    }

    Ok(flows)
}
