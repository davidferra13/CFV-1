-- Add 'local_connector' to ai_task_queue target_endpoint CHECK constraint
-- Required for BYOAI local AI connector system to work
ALTER TABLE ai_task_queue DROP CONSTRAINT ai_task_queue_target_endpoint_check;
ALTER TABLE ai_task_queue ADD CONSTRAINT ai_task_queue_target_endpoint_check
  CHECK (target_endpoint = ANY (ARRAY['auto'::text, 'pc'::text, 'pi'::text, 'local_connector'::text]));
