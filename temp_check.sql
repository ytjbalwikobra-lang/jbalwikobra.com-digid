SELECT id, phone, message_type, context_type, success, error_message, created_at 
FROM whatsapp_message_logs 
ORDER BY created_at DESC 
LIMIT 10;
