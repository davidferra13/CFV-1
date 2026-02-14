# RLS Subaccount Policies (V1)

## Subaccount Model

Subaccounts share same RLS policies as chefs in V1 (simplified).

If fine-grained permissions needed in V2:

```sql
CREATE POLICY subaccount_read_only ON events
FOR SELECT
USING (
  tenant_id = current_tenant_id() AND
  current_user_role() = 'chef_subaccount'
);

CREATE POLICY subaccount_no_finance ON ledger_entries
FOR SELECT
USING (FALSE);  -- Subaccounts cannot view finance
```

V1 uses same policies for chef and chef_subaccount. Differentiation happens in application layer.
