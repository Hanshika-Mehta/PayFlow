"""
Queue Monitoring Script
Monitors Redis queue, worker processing, and DLQ during load tests
"""
import asyncio
import aiohttp
import time
from datetime import datetime


class QueueMonitor:
    """Monitor queue and worker metrics during load tests"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.monitoring = False
        
    async def get_queue_stats(self, session: aiohttp.ClientSession):
        """Get queue statistics"""
        try:
            async with session.get(f"{self.base_url}/monitoring/queue") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            return {"error": str(e)}
        return None
    
    async def get_worker_stats(self, session: aiohttp.ClientSession):
        """Get worker statistics"""
        try:
            async with session.get(f"{self.base_url}/monitoring/workers") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            return {"error": str(e)}
        return None
    
    async def get_dlq_stats(self, session: aiohttp.ClientSession):
        """Get DLQ statistics"""
        try:
            async with session.get(f"{self.base_url}/monitoring/dlq") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            return {"error": str(e)}
        return None
    
    async def get_retry_stats(self, session: aiohttp.ClientSession):
        """Get retry statistics"""
        try:
            async with session.get(f"{self.base_url}/monitoring/retries") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            return {"error": str(e)}
        return None
    
    def print_stats(self, queue_stats, worker_stats, dlq_stats, retry_stats):
        """Print formatted statistics"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        print(f"\n{'='*80}")
        print(f"QUEUE MONITOR - {timestamp}")
        print(f"{'='*80}")
        
        if queue_stats and "error" not in queue_stats:
            print(f"\n📊 QUEUE STATS")
            print(f"   Pending Messages: {queue_stats.get('pending_count', 0)}")
            print(f"   Processing: {queue_stats.get('processing_count', 0)}")
            print(f"   Total Processed: {queue_stats.get('total_processed', 0)}")
            print(f"   Queue Lag: {queue_stats.get('lag_seconds', 0):.2f}s")
        
        if worker_stats and "error" not in worker_stats:
            print(f"\n⚙️  WORKER STATS")
            print(f"   Active Workers: {worker_stats.get('active_workers', 0)}")
            print(f"   Total Processed: {worker_stats.get('total_processed', 0)}")
            print(f"   Success Rate: {worker_stats.get('success_rate', 0):.2f}%")
            print(f"   Avg Processing Time: {worker_stats.get('avg_processing_time_ms', 0):.2f}ms")
        
        if dlq_stats and "error" not in dlq_stats:
            print(f"\n💀 DLQ STATS")
            print(f"   Failed Messages: {dlq_stats.get('total_messages', 0)}")
            print(f"   Recent Failures: {dlq_stats.get('recent_count', 0)}")
        
        if retry_stats and "error" not in retry_stats:
            print(f"\n🔄 RETRY STATS")
            print(f"   Total Retries: {retry_stats.get('total_retries', 0)}")
            print(f"   Retry Rate: {retry_stats.get('retry_rate', 0):.2f}%")
            print(f"   Avg Retry Count: {retry_stats.get('avg_retry_count', 0):.2f}")
        
        print(f"\n{'='*80}")
    
    async def monitor_continuous(self, interval: int = 5, duration: int = 60):
        """Monitor continuously for specified duration"""
        print(f"\n🔍 Starting continuous monitoring...")
        print(f"   Interval: {interval}s")
        print(f"   Duration: {duration}s")
        print(f"   Press Ctrl+C to stop\n")
        
        self.monitoring = True
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                while self.monitoring and (time.time() - start_time) < duration:
                    queue_stats = await self.get_queue_stats(session)
                    worker_stats = await self.get_worker_stats(session)
                    dlq_stats = await self.get_dlq_stats(session)
                    retry_stats = await self.get_retry_stats(session)
                    
                    self.print_stats(queue_stats, worker_stats, dlq_stats, retry_stats)
                    
                    await asyncio.sleep(interval)
        
        except KeyboardInterrupt:
            print("\n\n⏹️  Monitoring stopped by user")
        
        finally:
            self.monitoring = False
            print("\n✅ Monitoring complete\n")
    
    async def snapshot(self):
        """Take a single snapshot of current stats"""
        async with aiohttp.ClientSession() as session:
            queue_stats = await self.get_queue_stats(session)
            worker_stats = await self.get_worker_stats(session)
            dlq_stats = await self.get_dlq_stats(session)
            retry_stats = await self.get_retry_stats(session)
            
            self.print_stats(queue_stats, worker_stats, dlq_stats, retry_stats)


async def main():
    """Main entry point"""
    import sys
    
    monitor = QueueMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "snapshot":
        # Single snapshot
        await monitor.snapshot()
    else:
        # Continuous monitoring (default)
        interval = int(sys.argv[1]) if len(sys.argv) > 1 else 5
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 300
        await monitor.monitor_continuous(interval=interval, duration=duration)


if __name__ == "__main__":
    asyncio.run(main())

# Made with Bob
