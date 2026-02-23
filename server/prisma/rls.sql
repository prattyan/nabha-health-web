-- Row Level Security (RLS) policies for patient data tables.
--
-- How it works:
-- - The API sets these per-request (transaction-local) settings:
--     app.user_id  (string)
--     app.user_role (string, e.g. ADMIN/PATIENT/DOCTOR/HEALTH_WORKER/PHARMACY)
-- - Policies use current_setting(..., true) so missing settings evaluate to NULL.
--
-- IMPORTANT:
-- - Apply this only after the schema exists in PostgreSQL.
-- - After enabling RLS, requests must set app.user_id/app.user_role (the server does this via withRequestDb()).

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.user_id', true);
$$;

CREATE OR REPLACE FUNCTION app_user_role() RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.user_role', true);
$$;

-- Appointment
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_select ON "Appointment";
CREATE POLICY appointment_select ON "Appointment"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "doctorId" = app_user_id()
    OR "healthWorkerId" = app_user_id()
  );

DROP POLICY IF EXISTS appointment_write ON "Appointment";
CREATE POLICY appointment_write ON "Appointment"
  FOR INSERT, UPDATE
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "healthWorkerId" = app_user_id()
  );

-- EhrRecord
ALTER TABLE "EhrRecord" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ehr_select ON "EhrRecord";
CREATE POLICY ehr_select ON "EhrRecord"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "createdById" = app_user_id()
  );

DROP POLICY IF EXISTS ehr_write ON "EhrRecord";
CREATE POLICY ehr_write ON "EhrRecord"
  FOR INSERT, UPDATE
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "createdById" = app_user_id()
  );

-- Prescription
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rx_select ON "Prescription";
CREATE POLICY rx_select ON "Prescription"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "doctorId" = app_user_id()
  );

DROP POLICY IF EXISTS rx_write ON "Prescription";
CREATE POLICY rx_write ON "Prescription"
  FOR INSERT, UPDATE
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "doctorId" = app_user_id()
  );

-- PharmacyInventoryItem
ALTER TABLE "PharmacyInventoryItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inv_select ON "PharmacyInventoryItem";
CREATE POLICY inv_select ON "PharmacyInventoryItem"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "pharmacyId" = app_user_id()
  );

DROP POLICY IF EXISTS inv_write ON "PharmacyInventoryItem";
CREATE POLICY inv_write ON "PharmacyInventoryItem"
  FOR INSERT, UPDATE
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "pharmacyId" = app_user_id()
  );

-- AiTriageLog
ALTER TABLE "AiTriageLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS triage_select ON "AiTriageLog";
CREATE POLICY triage_select ON "AiTriageLog"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "createdById" = app_user_id()
  );

DROP POLICY IF EXISTS triage_write ON "AiTriageLog";
CREATE POLICY triage_write ON "AiTriageLog"
  FOR INSERT
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "createdById" = app_user_id()
  );

-- FollowUpVisit
ALTER TABLE "FollowUpVisit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fu_select ON "FollowUpVisit";
CREATE POLICY fu_select ON "FollowUpVisit"
  FOR SELECT
  USING (
    app_user_role() = 'ADMIN'
    OR "patientId" = app_user_id()
    OR "workerId" = app_user_id()
  );

DROP POLICY IF EXISTS fu_write ON "FollowUpVisit";
CREATE POLICY fu_write ON "FollowUpVisit"
  FOR INSERT, UPDATE
  WITH CHECK (
    app_user_role() = 'ADMIN'
    OR "workerId" = app_user_id()
  );
