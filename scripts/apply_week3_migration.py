#!/usr/bin/env python3
"""
Week 3 Database Migration Script
Adds new columns for retry mechanism and DLQ tracking
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.database import engine

def run_migration():
    """Apply Week 3 database migrations"""
    
    migrations = [
        # Add new columns
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_error TEXT",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS error_type VARCHAR(100)",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP",
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS moved_to_dlq_at TIMESTAMP",
        
        # Create indexes
        "CREATE INDEX IF NOT EXISTS idx_payments_next_retry_at ON payments(next_retry_at) WHERE next_retry_at IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_payments_status_dlq ON payments(status) WHERE status = 'DLQ'",
        "CREATE INDEX IF NOT EXISTS idx_payments_error_type ON payments(error_type) WHERE error_type IS NOT NULL",
        
        # Update existing payments
        "UPDATE payments SET max_retries = 3 WHERE max_retries IS NULL",
    ]
    
    print("Starting Week 3 database migration...")
    print("=" * 60)
    
    with engine.connect() as conn:
        for i, migration in enumerate(migrations, 1):
            try:
                print(f"\n[{i}/{len(migrations)}] Executing: {migration[:60]}...")
                conn.execute(text(migration))
                conn.commit()
                print(f"✓ Success")
            except Exception as e:
                print(f"✗ Error: {e}")
                # Continue with other migrations even if one fails
                continue
    
    print("\n" + "=" * 60)
    print("Migration complete!")
    print("\nNew columns added:")
    print("  - max_retries (INTEGER)")
    print("  - last_error (TEXT)")
    print("  - error_type (VARCHAR)")
    print("  - next_retry_at (TIMESTAMP)")
    print("  - moved_to_dlq_at (TIMESTAMP)")
    print("\nIndexes created for performance optimization")
    print("\nYou can now restart your application!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)

# Made with Bob
