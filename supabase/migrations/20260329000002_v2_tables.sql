-- =============================================================================
-- EWL Portal V2 — Step 1: Add partner enum value (must be separate transaction)
-- =============================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
