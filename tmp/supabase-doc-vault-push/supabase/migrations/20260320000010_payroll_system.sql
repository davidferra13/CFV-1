-- Migration: 20260320000010_payroll_system
-- Adds W-2 employee payroll tracking: employee roster, payroll records,
-- Form 941 quarterly summaries, and W-2 annual summaries.
-- Covers solo business owners through small corporate structures.

-- TABLE 1: Employee roster (W-2 employees, distinct from 1099 contractors)
CREATE TABLE employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id               UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  staff_member_id       UUID REFERENCES staff_members(id) ON DELETE SET NULL,

  -- Identity
  name                  TEXT NOT NULL,
  ssn_last4             TEXT,           -- last 4 digits for display only; never store full SSN
  email                 TEXT,
  phone                 TEXT,

  -- Address
  address_street        TEXT,
  address_city          TEXT,
  address_state         TEXT,
  address_zip           TEXT,

  -- W-4 withholding info
  filing_status         TEXT NOT NULL DEFAULT 'single'
                        CHECK (filing_status IN ('single', 'married_filing_jointly', 'head_of_household')),
  allowances            INTEGER NOT NULL DEFAULT 0,
  additional_withholding_cents INTEGER NOT NULL DEFAULT 0,

  -- Employment dates
  hire_date             DATE NOT NULL,
  termination_date      DATE,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'terminated', 'on_leave')),

  -- Pay rate
  pay_type              TEXT NOT NULL DEFAULT 'hourly'
                        CHECK (pay_type IN ('hourly', 'salary')),
  hourly_rate_cents     INTEGER,
  annual_salary_cents   INTEGER,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- TABLE 2: Individual payroll records (one per pay period per employee)
CREATE TABLE payroll_records (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  employee_id                 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  pay_period_start            DATE NOT NULL,
  pay_period_end              DATE NOT NULL,
  pay_date                    DATE NOT NULL,

  -- Hours worked
  regular_hours               NUMERIC(6, 2) NOT NULL DEFAULT 0,
  overtime_hours              NUMERIC(6, 2) NOT NULL DEFAULT 0,

  -- Pay amounts (all in cents)
  regular_pay_cents           INTEGER NOT NULL DEFAULT 0,
  overtime_pay_cents          INTEGER NOT NULL DEFAULT 0,
  gross_pay_cents             INTEGER NOT NULL DEFAULT 0,

  -- Employee withholdings (deducted from gross pay)
  federal_income_tax_cents    INTEGER NOT NULL DEFAULT 0,
  employee_ss_tax_cents       INTEGER NOT NULL DEFAULT 0,   -- 6.2% of gross up to wage base
  employee_medicare_tax_cents INTEGER NOT NULL DEFAULT 0,   -- 1.45% of gross
  state_income_tax_cents      INTEGER NOT NULL DEFAULT 0,

  -- Employer taxes (not deducted from employee — employer cost)
  employer_ss_tax_cents       INTEGER NOT NULL DEFAULT 0,   -- 6.2% matching
  employer_medicare_tax_cents INTEGER NOT NULL DEFAULT 0,   -- 1.45% matching
  employer_futa_cents         INTEGER NOT NULL DEFAULT 0,   -- 0.6% of first $7,000

  net_pay_cents               INTEGER NOT NULL DEFAULT 0,

  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- TABLE 3: Form 941 quarterly summaries
CREATE TABLE payroll_941_summaries (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  tax_year                    INTEGER NOT NULL,
  quarter                     INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),

  -- Aggregated 941 amounts (cents)
  total_wages_cents           INTEGER NOT NULL DEFAULT 0,
  federal_income_tax_withheld_cents INTEGER NOT NULL DEFAULT 0,
  employee_ss_tax_cents       INTEGER NOT NULL DEFAULT 0,
  employee_medicare_tax_cents INTEGER NOT NULL DEFAULT 0,
  employer_ss_tax_cents       INTEGER NOT NULL DEFAULT 0,
  employer_medicare_tax_cents INTEGER NOT NULL DEFAULT 0,
  -- Line 6: total taxes before adjustments
  total_taxes_cents           INTEGER NOT NULL DEFAULT 0,

  -- Filing status
  filed                       BOOLEAN NOT NULL DEFAULT false,
  filed_at                    TIMESTAMPTZ,
  confirmation_number         TEXT,
  notes                       TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chef_id, tax_year, quarter)
);
-- TABLE 4: W-2 annual summaries (one per employee per year)
CREATE TABLE payroll_w2_summaries (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id                     UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  employee_id                 UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  tax_year                    INTEGER NOT NULL,

  -- W-2 Box values (all in cents)
  box1_wages_cents            INTEGER NOT NULL DEFAULT 0,   -- taxable wages
  box2_federal_withheld_cents INTEGER NOT NULL DEFAULT 0,
  box3_ss_wages_cents         INTEGER NOT NULL DEFAULT 0,
  box4_ss_withheld_cents      INTEGER NOT NULL DEFAULT 0,   -- 6.2%
  box5_medicare_wages_cents   INTEGER NOT NULL DEFAULT 0,
  box6_medicare_withheld_cents INTEGER NOT NULL DEFAULT 0,  -- 1.45%
  box17_state_tax_cents       INTEGER NOT NULL DEFAULT 0,

  generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (chef_id, employee_id, tax_year)
);
-- Indexes
CREATE INDEX idx_employees_chef       ON employees(chef_id, status);
CREATE INDEX idx_payroll_records_chef ON payroll_records(chef_id, pay_date DESC);
CREATE INDEX idx_payroll_records_emp  ON payroll_records(employee_id, pay_period_start DESC);
CREATE INDEX idx_941_chef_year        ON payroll_941_summaries(chef_id, tax_year DESC);
CREATE INDEX idx_w2_chef_year         ON payroll_w2_summaries(chef_id, tax_year DESC);
-- Update triggers
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payroll_records_updated_at
  BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payroll_941_updated_at
  BEFORE UPDATE ON payroll_941_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS: employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY emp_chef_select ON employees FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY emp_chef_insert ON employees FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY emp_chef_update ON employees FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY emp_chef_delete ON employees FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- RLS: payroll_records
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_chef_select ON payroll_records FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pr_chef_insert ON payroll_records FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pr_chef_update ON payroll_records FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY pr_chef_delete ON payroll_records FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- RLS: payroll_941_summaries
ALTER TABLE payroll_941_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY p941_chef_select ON payroll_941_summaries FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p941_chef_insert ON payroll_941_summaries FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p941_chef_update ON payroll_941_summaries FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY p941_chef_delete ON payroll_941_summaries FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- RLS: payroll_w2_summaries
ALTER TABLE payroll_w2_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY w2_chef_select ON payroll_w2_summaries FOR SELECT
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY w2_chef_insert ON payroll_w2_summaries FOR INSERT
  WITH CHECK (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY w2_chef_update ON payroll_w2_summaries FOR UPDATE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
CREATE POLICY w2_chef_delete ON payroll_w2_summaries FOR DELETE
  USING (get_current_user_role() = 'chef' AND chef_id = get_current_tenant_id());
-- Comments
COMMENT ON COLUMN employees.ssn_last4 IS
  'Last 4 digits of SSN for display only. Never store full SSN in this system.';
COMMENT ON COLUMN payroll_records.employer_futa_cents IS
  'FUTA = 0.6% of first $7,000 per employee per year (net of state credit). Employer cost only.';
COMMENT ON TABLE payroll_941_summaries IS
  'Form 941 quarterly aggregates. File via IRS-approved software. This is reference data only.';
COMMENT ON TABLE payroll_w2_summaries IS
  'W-2 annual values per employee. File via SSA-approved software. This is reference data only.';
