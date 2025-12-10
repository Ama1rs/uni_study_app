ALTER TABLE resources ADD COLUMN repository_id INTEGER REFERENCES repositories(id);
ALTER TABLE lectures ADD COLUMN repository_id INTEGER REFERENCES repositories(id);
