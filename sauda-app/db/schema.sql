-- Sauda App schema (Oil division)

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,           -- SIKOF, ANA, Kirti, SSD...
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                  -- RMC's own customers
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | pending_review
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, location)
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id), -- strict mapping: item belongs to exactly one client company
  category TEXT,                        -- Vanaspati Tin/Jar, Palm, Super Lite, etc.
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(name, company_id)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'purchase', 'sales')), -- admin=Rishabh, purchase=Ganesh, sales=reps
  active BOOLEAN NOT NULL DEFAULT true,
  pin TEXT NOT NULL  -- simple 4-digit login, mirrors OMS rep login pattern
);

CREATE TABLE IF NOT EXISTS purchase_sauda (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  payment_terms TEXT,
  location TEXT,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','partially_dispatched','closed','cancelled')),
  dispatched_qty NUMERIC NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_sauda (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  payment_terms TEXT,
  location TEXT,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','sold','closed','cancelled')),
  sold_qty NUMERIC NOT NULL DEFAULT 0,
  cancel_reason TEXT,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_sauda_status ON purchase_sauda(status);
CREATE INDEX IF NOT EXISTS idx_sales_sauda_status ON sales_sauda(status);
CREATE INDEX IF NOT EXISTS idx_sales_sauda_created_by ON sales_sauda(created_by);
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
