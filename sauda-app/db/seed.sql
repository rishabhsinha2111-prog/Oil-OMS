-- Seed the client companies seen in the current sauda sheets
INSERT INTO companies (name) VALUES
  ('SIKOF'), ('ANA'), ('Kirti'), ('SSD'), ('RMC')
ON CONFLICT (name) DO NOTHING;

-- Seed users - update names/PINs before going live
-- role: admin = Rishabh (full visibility), purchase = Ganesh, sales = each rep
INSERT INTO users (name, role, pin) VALUES
  ('Rishabh', 'admin', '0000'),
  ('Ganesh', 'purchase', '1111')
ON CONFLICT (name) DO NOTHING;

-- Sample items - replace/extend with the full product list per company
INSERT INTO items (name, company_id, category)
SELECT 'Rajani VP 890 GR (1X16)', id, 'Vanaspati' FROM companies WHERE name = 'SIKOF'
ON CONFLICT DO NOTHING;

INSERT INTO items (name, company_id, category)
SELECT 'Surya Gold Vanaspati Tin 15 KG', id, 'Vanaspati Tin/Jar' FROM companies WHERE name = 'SIKOF'
ON CONFLICT DO NOTHING;
