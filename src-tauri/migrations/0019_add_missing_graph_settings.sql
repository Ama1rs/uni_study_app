-- Add graph visibility columns to app_settings table
ALTER TABLE app_settings ADD COLUMN graph_show_legend INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN graph_show_topology INTEGER DEFAULT 1;
