-- Week 3 Database Migration
-- Adds retry and DLQ tracking fields to payments table

-- Add new columns for retry mechanism
ALTER TABLE payments ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_type VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS moved_to_dlq_at TIMESTAMP;

-- Create index on next_retry_at for efficient retry scheduling queries
CREATE INDEX IF NOT EXISTS idx_payments_next_retry_at ON payments(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Create index on status for DLQ queries
CREATE INDEX IF NOT EXISTS idx_payments_status_dlq ON payments(status) WHERE status = 'DLQ';

-- Create index on error_type for analytics
CREATE INDEX IF NOT EXISTS idx_payments_error_type ON payments(error_type) WHERE error_type IS NOT NULL;

-- Update existing payments to have default max_retries
UPDATE payments SET max_retries = 3 WHERE max_retries IS NULL;

COMMENT ON COLUMN payments.max_retries IS 'Maximum number of retry attempts before moving to DLQ';
COMMENT ON COLUMN payments.last_error IS 'Error message from the last failed attempt';
COMMENT ON COLUMN payments.error_type IS 'Type of error (GATEWAY_TIMEOUT, NETWORK_ERROR, etc.)';
COMMENT ON COLUMN payments.next_retry_at IS 'Timestamp when the payment should be retried';
COMMENT ON COLUMN payments.moved_to_dlq_at IS 'Timestamp when the payment was moved to Dead Letter Queue';

-- Made with Bob
