-- Instagram Direct integration fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram_access_token TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram_page_id TEXT;

-- Instagram ID on contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id TEXT;

-- Index for fast lookup by instagram_id
CREATE INDEX IF NOT EXISTS idx_contacts_instagram_id ON contacts(instagram_id);
CREATE INDEX IF NOT EXISTS idx_companies_instagram_page_id ON companies(instagram_page_id);
