-- Add graph customization columns to app_settings table
ALTER TABLE app_settings ADD COLUMN graph_node_color TEXT DEFAULT '#2383E2';
ALTER TABLE app_settings ADD COLUMN graph_link_color TEXT DEFAULT 'rgba(255,255,255,0.15)';
ALTER TABLE app_settings ADD COLUMN graph_node_size REAL DEFAULT 3.0;
ALTER TABLE app_settings ADD COLUMN graph_link_width REAL DEFAULT 0.5;
ALTER TABLE app_settings ADD COLUMN graph_show_labels INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN graph_label_size REAL DEFAULT 12.0;
