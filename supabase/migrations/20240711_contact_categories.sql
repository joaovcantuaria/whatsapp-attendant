-- Tabela de Categorias de Contato
CREATE TABLE IF NOT EXISTS contact_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280', -- cor hex para badge
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de relação contato-categoria (muitos para muitos)
CREATE TABLE IF NOT EXISTS contact_category_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES contact_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, category_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contact_categories_company ON contact_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_category_assign_contact ON contact_category_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_category_assign_category ON contact_category_assignments(category_id);

-- RLS
ALTER TABLE contact_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_categories_company_access" ON contact_categories
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "contact_category_assignments_access" ON contact_category_assignments
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM contacts WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Inserir categorias padrão (serão criadas por empresa via seed ou na primeira vez)
-- As categorias default serão inseridas via API na primeira chamada
