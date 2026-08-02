-- MANUAL MIGRATION SCRIPT FOR EXISTING BASE64 RECEIPTS
-- 
-- This script should be run manually by an admin after deploying migration 022
-- It extracts Base64 image data from the receipt_url column and uploads it to Supabase Storage
-- 
-- IMPORTANT: This script requires manual execution and cannot be fully automated via SQL alone
-- because Supabase Storage operations require the Storage API, not just SQL.
--
-- STEPS TO MIGRATE:
-- 1. Run migration 022_payment_receipt_storage.sql first
-- 2. Run this SQL to identify records that need migration
-- 3. For each record returned, use the Supabase Storage API or dashboard to:
--    a. Extract the Base64 data from receipt_url (remove data:image/xxx;base64, prefix)
--    b. Decode the Base64 to binary
--    c. Upload to storage.payment_receipts bucket at path: student_id/receipt_id.jpg
--    d. Update the record: SET receipt_file_path = <path>, is_base64_migrated = true
--
-- QUERY TO FIND RECORDS NEEDING MIGRATION:
SELECT 
    id,
    student_id,
    quiz_id,
    receipt_url,
    created_at
FROM exam_payment_verifications 
WHERE receipt_url LIKE 'data:image/%' 
AND is_base64_migrated = false
ORDER BY created_at;

-- After manual migration is complete, you can verify with:
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN receipt_file_path IS NOT NULL THEN 1 END) as storage_based,
    COUNT(CASE WHEN receipt_url LIKE 'data:image/%' AND is_base64_migrated = false THEN 1 END) as needs_migration
FROM exam_payment_verifications;

-- EXAMPLE UPDATE STATEMENT (run after each manual upload):
-- UPDATE exam_payment_verifications 
-- SET receipt_file_path = 'student_uuid/receipt_uuid.jpg',
--     is_base64_migrated = true
-- WHERE id = 'receipt_uuid';
