CREATE TABLE IF NOT EXISTS finance_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category TEXT NOT NULL,
    is_positive INTEGER NOT NULL DEFAULT 0 -- 1 for income, 0 for expense
);

CREATE TABLE IF NOT EXISTS finance_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    limit_amount REAL NOT NULL,
    spent_amount REAL DEFAULT 0,
    period TEXT DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS finance_savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline DATETIME
);

CREATE TABLE IF NOT EXISTS finance_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    color TEXT
);

-- Initial Asset Data
INSERT OR IGNORE INTO finance_assets (label, amount, type, color) VALUES ('Cash & Savings', 45200, 'cash', 'bg-blue-500');
INSERT OR IGNORE INTO finance_assets (label, amount, type, color) VALUES ('Stock Market', 62150, 'stock', 'bg-emerald-500');
INSERT OR IGNORE INTO finance_assets (label, amount, type, color) VALUES ('Crypto', 12242, 'crypto', 'bg-orange-500');
INSERT OR IGNORE INTO finance_assets (label, amount, type, color) VALUES ('Others', 5000, 'other', 'bg-purple-500');

-- Initial Budget Data
INSERT OR IGNORE INTO finance_budgets (category, limit_amount, spent_amount) VALUES ('Housing', 2000, 1800);
INSERT OR IGNORE INTO finance_budgets (category, limit_amount, spent_amount) VALUES ('Equipments', 1000, 650);
INSERT OR IGNORE INTO finance_budgets (category, limit_amount, spent_amount) VALUES ('Subscriptions', 150, 120);
INSERT OR IGNORE INTO finance_budgets (category, limit_amount, spent_amount) VALUES ('Leisure', 500, 450);
INSERT OR IGNORE INTO finance_budgets (category, limit_amount, spent_amount) VALUES ('Education', 200, 130);

-- Initial Savings Goal
INSERT OR IGNORE INTO finance_savings_goals (name, target_amount, current_amount) VALUES ('New Setup Project', 12000, 5040);
