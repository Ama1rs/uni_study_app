-- Supabase Schema for Uni Study App
-- Includes RLS policies, tombstones, and sync tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device registration table
CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    sync_protocol_version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core data tables with tombstone support
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Tombstone support
    sync_order INTEGER DEFAULT 0 -- For deterministic ordering
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    mime_type TEXT,
    file_size BIGINT,
    content_hash TEXT, -- SHA-256 for integrity
    storage_path TEXT, -- Path in Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    source_resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    target_resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    duration_minutes INTEGER,
    progress_percentage REAL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planner_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    sync_order INTEGER DEFAULT 0
);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Devices RLS
CREATE POLICY "Users can view own devices" ON devices
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own devices" ON devices
    FOR ALL USING (user_id = auth.uid());

-- Sync Metadata RLS
CREATE POLICY "Users can view own sync metadata" ON sync_metadata
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sync metadata" ON sync_metadata
    FOR ALL USING (user_id = auth.uid());

-- Core Data Tables RLS (Generic policies)
CREATE POLICY "Users can view own repositories" ON repositories
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own repositories" ON repositories
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own resources" ON resources
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own resources" ON resources
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own links" ON links
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own links" ON links
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own lectures" ON lectures
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own lectures" ON lectures
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own flashcards" ON flashcards
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own planner events" ON planner_events
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own planner events" ON planner_events
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can manage own tasks" ON tasks
    FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_deleted_at ON repositories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_repository_id ON resources(repository_id);
CREATE INDEX IF NOT EXISTS idx_resources_deleted_at ON resources(deleted_at);
CREATE INDEX IF NOT EXISTS idx_resources_content_hash ON resources(content_hash);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON links(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lectures_user_id ON lectures(user_id);
CREATE INDEX IF NOT EXISTS idx_lectures_repository_id ON lectures(repository_id);
CREATE INDEX IF NOT EXISTS idx_lectures_deleted_at ON lectures(deleted_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_repository_id ON flashcards(repository_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted_at ON flashcards(deleted_at);
CREATE INDEX IF NOT EXISTS idx_planner_events_user_id ON planner_events(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_repository_id ON planner_events(repository_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_deleted_at ON planner_events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_repository_id ON tasks(repository_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Functions and triggers for server-side timestamping
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for server-side timestamp on insert/update for LWW
CREATE OR REPLACE FUNCTION set_server_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for server-side timestamping
CREATE TRIGGER handle_profiles_updated_at
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_repositories_updated_at
    BEFORE INSERT OR UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_resources_updated_at
    BEFORE INSERT OR UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_links_updated_at
    BEFORE INSERT OR UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_lectures_updated_at
    BEFORE INSERT OR UPDATE ON lectures
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_flashcards_updated_at
    BEFORE INSERT OR UPDATE ON flashcards
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_planner_events_updated_at
    BEFORE INSERT OR UPDATE ON planner_events
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

CREATE TRIGGER handle_tasks_updated_at
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_server_timestamp();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('resources', 'resources', false, 52428800, ARRAY['application/pdf', 'image/*', 'text/*', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies (user-prefixed paths)
CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resources' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own resources" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resources' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own resources" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'resources' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own resources" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resources' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );