import { invoke } from '@tauri-apps/api/core';

export interface FinanceTransaction {
    id?: number;
    label: string;
    amount: number;
    date?: string;
    category: string;
    is_positive: boolean;
}

export interface FinanceBudget {
    id?: number;
    category: string;
    limit_amount: number;
    spent_amount: number;
    period: string;
}

export interface SavingsGoal {
    id?: number;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
}

export interface FinanceAsset {
    id?: number;
    label: string;
    amount: number;
    type_: string;
    color?: string;
}

export interface FinanceSummary {
    total_net_worth: number;
    monthly_income: number;
    monthly_spent: number;
    income_change_pct: number;
    net_worth_history: number[];
}

export interface ExpenseFlow {
    source: string;
    target: string;
    value: number;
}

export const financeService = {
    getSummary: () => invoke<FinanceSummary>('get_finance_summary'),
    getTransactions: () => invoke<FinanceTransaction[]>('get_finance_transactions'),
    createTransaction: (transaction: FinanceTransaction) => invoke<number>('create_finance_transaction', { transaction }),
    updateTransaction: (transaction: FinanceTransaction) => invoke<void>('update_finance_transaction', { transaction }),
    deleteTransaction: (id: number) => invoke<void>('delete_finance_transaction', { id }),
    getBudgets: () => invoke<FinanceBudget[]>('get_finance_budgets'),
    createBudget: (budget: FinanceBudget) => invoke<number>('create_finance_budget', { budget }),
    updateBudget: (budget: FinanceBudget) => invoke<void>('update_finance_budget', { budget }),
    deleteBudget: (id: number) => invoke<void>('delete_finance_budget', { id }),
    getSavingsGoals: () => invoke<SavingsGoal[]>('get_savings_goals'),
    updateSavingsGoal: (goal: SavingsGoal) => invoke<void>('update_savings_goal', { goal }),
    getAssets: () => invoke<FinanceAsset[]>('get_finance_assets'),
    createAsset: (asset: FinanceAsset) => invoke<number>('create_finance_asset', { asset }),
    updateAsset: (asset: FinanceAsset) => invoke<void>('update_finance_asset', { asset }),
    deleteAsset: (id: number) => invoke<void>('delete_finance_asset', { id }),
    getExpenseFlows: () => invoke<ExpenseFlow[]>('get_expense_flows'),
};
