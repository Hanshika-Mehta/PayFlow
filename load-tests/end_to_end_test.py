"""
End-to-End Load Test with Complete Processing Verification
Waits for workers to process all payments and provides comprehensive metrics
"""
import asyncio
import aiohttp
import time
import uuid
import random
from typing import Dict, Any, List
from datetime import datetime
import json
from collections import defaultdict
import statistics


class EndToEndLoadTest:
    """Complete end-to-end load test with processing verification"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.payment_ids = []
        self.start_time = None
        self.end_time = None
        
        # API metrics
        self.api_requests = 0
        self.api_success = 0
        self.api_failed = 0
        self.api_response_times = []
        
        # Processing metrics
        self.final_status_counts = defaultdict(int)
        self.processing_times = []
        
    async def create_payment(self, session: aiohttp.ClientSession, 
                            user_id: str, amount: float) -> Dict[str, Any]:
        """Create a payment and track it"""
        url = f"{self.base_url}/payments"
        idempotency_key = f"e2e_test_{uuid.uuid4().hex}"
        
        payload = {"user_id": user_id, "amount": amount}
        headers = {"Idempotency-Key": idempotency_key}
        
        start = time.time()
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                elapsed = time.time() - start
                self.api_response_times.append(elapsed)
                self.api_requests += 1
                
                if response.status == 201:
                    self.api_success += 1
                    data = await response.json()
                    payment_id = data.get("payment_id")
                    self.payment_ids.append({
                        "id": payment_id,
                        "created_at": time.time(),
                        "user_id": user_id,
                        "amount": amount
                    })
                    return {"success": True, "payment_id": payment_id}
                else:
                    self.api_failed += 1
                    return {"success": False, "status": response.status}
        except Exception as e:
            self.api_failed += 1
            return {"success": False, "error": str(e)}
    
    async def check_payment_status(self, session: aiohttp.ClientSession, 
                                  payment_id: str) -> Dict[str, Any]:
        """Check payment status"""
        url = f"{self.base_url}/payments/{payment_id}"
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
        except Exception:
            pass
        return None
    
    async def get_monitoring_stats(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Get all monitoring statistics"""
        stats = {}
        
        endpoints = {
            "queue": "/monitoring/queue",
            "workers": "/monitoring/workers",
            "dlq": "/monitoring/dlq",
            "retries": "/monitoring/retries",
            "idempotency": "/monitoring/idempotency"
        }
        
        for name, endpoint in endpoints.items():
            try:
                async with session.get(f"{self.base_url}{endpoint}") as response:
                    if response.status == 200:
                        stats[name] = await response.json()
            except Exception as e:
                stats[name] = {"error": str(e)}
        
        return stats
    
    async def wait_for_processing(self, session: aiohttp.ClientSession, 
                                 max_wait_seconds: int = 300):
        """Wait for all payments to be processed"""
        print(f"\n⏳ Waiting for workers to process {len(self.payment_ids)} payments...")
        print(f"   Max wait time: {max_wait_seconds}s")
        
        start_wait = time.time()
        check_interval = 5  # Check every 5 seconds
        last_pending = len(self.payment_ids)
        
        while (time.time() - start_wait) < max_wait_seconds:
            # Check status of sample payments
            pending = 0
            processing = 0
            completed = 0
            
            sample_size = min(100, len(self.payment_ids))
            for payment_info in self.payment_ids[:sample_size]:
                status_data = await self.check_payment_status(session, payment_info["id"])
                if status_data:
                    status = status_data.get("status", "UNKNOWN")
                    if status in ["PENDING", "PROCESSING"]:
                        if status == "PENDING":
                            pending += 1
                        else:
                            processing += 1
                    else:
                        completed += 1
            
            # Get queue stats
            stats = await self.get_monitoring_stats(session)
            queue_stats = stats.get("queue", {})
            queue_pending = queue_stats.get("pending_count", 0)
            
            elapsed = time.time() - start_wait
            print(f"   [{elapsed:.0f}s] Queue: {queue_pending} pending | "
                  f"Sample: {pending} pending, {processing} processing, {completed} completed")
            
            # Check if processing is complete
            if queue_pending == 0 and pending == 0 and processing == 0:
                print(f"\n✅ All payments processed in {elapsed:.1f}s")
                break
            
            # Check if stuck
            if queue_pending == last_pending and elapsed > 60:
                print(f"\n⚠️  Processing appears stuck. Queue not decreasing.")
                break
            
            last_pending = queue_pending
            await asyncio.sleep(check_interval)
        else:
            print(f"\n⏱️  Timeout reached after {max_wait_seconds}s")
    
    async def verify_final_status(self, session: aiohttp.ClientSession):
        """Check final status of all payments"""
        print(f"\n🔍 Verifying final status of {len(self.payment_ids)} payments...")
        
        for i, payment_info in enumerate(self.payment_ids):
            status_data = await self.check_payment_status(session, payment_info["id"])
            if status_data:
                status = status_data.get("status", "UNKNOWN")
                self.final_status_counts[status] += 1
                
                # Calculate processing time
                if status in ["SUCCESS", "FAILED"]:
                    processing_time = time.time() - payment_info["created_at"]
                    self.processing_times.append(processing_time)
            else:
                self.final_status_counts["NOT_FOUND"] += 1
            
            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"   Verified {i + 1}/{len(self.payment_ids)} payments...")
            
            # Small delay to avoid overwhelming API
            if len(self.payment_ids) > 100:
                await asyncio.sleep(0.01)
        
        print(f"   ✅ Verification complete")
    
    def print_comprehensive_report(self, monitoring_stats: Dict[str, Any]):
        """Print detailed test report"""
        duration = self.end_time - self.start_time if self.end_time else 0
        
        print("\n" + "="*80)
        print("END-TO-END LOAD TEST RESULTS")
        print("="*80)
        
        # Phase 1: API Performance
        print(f"\n📡 PHASE 1: API PERFORMANCE")
        print(f"   Duration: {duration:.2f}s")
        print(f"   Total API Requests: {self.api_requests}")
        print(f"   Successful: {self.api_success} ({self.api_success/self.api_requests*100:.1f}%)")
        print(f"   Failed: {self.api_failed}")
        print(f"   Throughput: {self.api_requests/duration:.1f} req/s")
        
        if self.api_response_times:
            print(f"\n   API Response Times:")
            print(f"   - Min: {min(self.api_response_times)*1000:.1f}ms")
            print(f"   - Avg: {statistics.mean(self.api_response_times)*1000:.1f}ms")
            print(f"   - Max: {max(self.api_response_times)*1000:.1f}ms")
        
        # Phase 2: Processing Results
        print(f"\n⚙️  PHASE 2: WORKER PROCESSING")
        print(f"   Final Payment Status:")
        total_processed = sum(self.final_status_counts.values())
        for status, count in sorted(self.final_status_counts.items()):
            percentage = (count / total_processed * 100) if total_processed > 0 else 0
            print(f"   - {status}: {count} ({percentage:.1f}%)")
        
        if self.processing_times:
            print(f"\n   End-to-End Processing Times:")
            print(f"   - Min: {min(self.processing_times):.1f}s")
            print(f"   - Avg: {statistics.mean(self.processing_times):.1f}s")
            print(f"   - Max: {max(self.processing_times):.1f}s")
        
        # Phase 3: Queue Health
        queue_stats = monitoring_stats.get("queue", {})
        if queue_stats and "error" not in queue_stats:
            print(f"\n📊 PHASE 3: QUEUE HEALTH")
            print(f"   Pending Messages: {queue_stats.get('pending_count', 0)}")
            print(f"   Total Processed: {queue_stats.get('total_processed', 0)}")
            print(f"   Queue Lag: {queue_stats.get('lag_seconds', 0):.1f}s")
            print(f"   Throughput: {queue_stats.get('throughput', 0):.1f} msg/s")
        
        # Phase 4: Worker Health
        worker_stats = monitoring_stats.get("workers", {})
        if worker_stats and "error" not in worker_stats:
            print(f"\n👷 PHASE 4: WORKER HEALTH")
            print(f"   Active Workers: {worker_stats.get('active_workers', 0)}")
            print(f"   Total Processed: {worker_stats.get('total_processed', 0)}")
            print(f"   Success Rate: {worker_stats.get('success_rate', 0):.1f}%")
            print(f"   Avg Processing Time: {worker_stats.get('avg_processing_time_ms', 0):.1f}ms")
        
        # Phase 5: Retry & Recovery
        retry_stats = monitoring_stats.get("retries", {})
        if retry_stats and "error" not in retry_stats:
            print(f"\n🔄 PHASE 5: RETRY & RECOVERY")
            print(f"   Total Retries: {retry_stats.get('total_retries', 0)}")
            print(f"   Retry Rate: {retry_stats.get('retry_rate', 0):.1f}%")
            print(f"   Successful After Retry: {retry_stats.get('successful_after_retry', 0)}")
            print(f"   Failed After Max Retries: {retry_stats.get('failed_after_max_retries', 0)}")
            
            # Calculate recovery ratio
            successful = retry_stats.get('successful_after_retry', 0)
            failed = retry_stats.get('failed_after_max_retries', 0)
            if successful + failed > 0:
                recovery_ratio = successful / (successful + failed) * 100
                print(f"   Recovery Ratio: {recovery_ratio:.1f}% (Successful/Total Failures)")
        
        # Phase 6: Dead Letter Queue
        dlq_stats = monitoring_stats.get("dlq", {})
        if dlq_stats and "error" not in dlq_stats:
            print(f"\n💀 PHASE 6: DEAD LETTER QUEUE")
            print(f"   Total Messages: {dlq_stats.get('total_messages', 0)}")
            print(f"   Recent Failures: {dlq_stats.get('recent_count', 0)}")
            print(f"   Failure Rate: {dlq_stats.get('failure_rate', 0):.1f}%")
        
        # Phase 7: Idempotency
        idem_stats = monitoring_stats.get("idempotency", {})
        if idem_stats and "error" not in idem_stats:
            print(f"\n🔒 PHASE 7: IDEMPOTENCY")
            print(f"   Total Keys: {idem_stats.get('total_keys', 0)}")
            print(f"   Cache Hits: {idem_stats.get('cache_hits', 0)}")
            print(f"   Hit Rate: {idem_stats.get('hit_rate', 0):.1f}%")
            print(f"   Duplicates Prevented: {idem_stats.get('duplicates_prevented', 0)}")
        
        print("\n" + "="*80)
        
        # Overall Assessment
        success_rate = self.final_status_counts.get("SUCCESS", 0) / total_processed * 100 if total_processed > 0 else 0
        
        print(f"\n🎯 OVERALL ASSESSMENT")
        if success_rate >= 95:
            print(f"   ✅ EXCELLENT: {success_rate:.1f}% success rate")
        elif success_rate >= 85:
            print(f"   ✓ GOOD: {success_rate:.1f}% success rate")
        elif success_rate >= 70:
            print(f"   ⚠️  FAIR: {success_rate:.1f}% success rate - needs improvement")
        else:
            print(f"   ❌ POOR: {success_rate:.1f}% success rate - critical issues")
        
        print("\n" + "="*80 + "\n")
    
    async def run_test(self, num_payments: int = 1000, concurrent: int = 50):
        """Run complete end-to-end test"""
        print(f"\n{'='*80}")
        print(f"END-TO-END LOAD TEST")
        print(f"{'='*80}")
        print(f"Creating {num_payments} payments with {concurrent} concurrent workers")
        print(f"Will wait for complete processing and verify results\n")
        
        self.start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            # Phase 1: Create payments
            print(f"📡 PHASE 1: Creating {num_payments} payments...")
            tasks = []
            for i in range(num_payments):
                user_id = f"user_{random.randint(1, 100):03d}"
                amount = round(random.uniform(10, 1000), 2)
                tasks.append(self.create_payment(session, user_id, amount))
                
                # Process in batches
                if len(tasks) >= concurrent:
                    await asyncio.gather(*tasks)
                    tasks = []
                    if (i + 1) % 100 == 0:
                        print(f"   Created {i + 1}/{num_payments} payments...")
            
            # Process remaining
            if tasks:
                await asyncio.gather(*tasks)
            
            api_duration = time.time() - self.start_time
            print(f"✅ Created {self.api_success} payments in {api_duration:.2f}s")
            
            # Phase 2: Wait for processing
            await self.wait_for_processing(session, max_wait_seconds=300)
            
            # Phase 3: Verify final status
            await self.verify_final_status(session)
            
            # Phase 4: Get final monitoring stats
            print(f"\n📊 Collecting final monitoring statistics...")
            monitoring_stats = await self.get_monitoring_stats(session)
            
            self.end_time = time.time()
            
            # Print comprehensive report
            self.print_comprehensive_report(monitoring_stats)
            
            # Save results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"e2e_test_results_{timestamp}.json"
            
            results = {
                "test_config": {
                    "num_payments": num_payments,
                    "concurrent": concurrent,
                    "duration": self.end_time - self.start_time
                },
                "api_metrics": {
                    "total_requests": self.api_requests,
                    "successful": self.api_success,
                    "failed": self.api_failed,
                    "avg_response_time_ms": statistics.mean(self.api_response_times) * 1000 if self.api_response_times else 0
                },
                "processing_metrics": {
                    "final_status": dict(self.final_status_counts),
                    "avg_processing_time_s": statistics.mean(self.processing_times) if self.processing_times else 0
                },
                "monitoring_stats": monitoring_stats
            }
            
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"📄 Results saved to: {filename}\n")


async def main():
    """Main entry point"""
    import sys
    
    num_payments = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    concurrent = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    tester = EndToEndLoadTest()
    await tester.run_test(num_payments=num_payments, concurrent=concurrent)


if __name__ == "__main__":
    asyncio.run(main())

# Made with Bob
