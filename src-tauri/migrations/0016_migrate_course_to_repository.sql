-- Migrate course_id to repository_id for existing resources
UPDATE resources SET repository_id = course_id WHERE repository_id IS NULL;

-- Migrate course_id to repository_id for existing lectures
UPDATE lectures SET repository_id = course_id WHERE repository_id IS NULL;