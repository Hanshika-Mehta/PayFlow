"""
Comprehensive Bulk Load Testing Suite for PayFlow
Tests: 10,000+ transactions, concurrent API hits, idempotency, rate limiting, and failure scenarios
"""
import asyncio
import aiohttp
import time
import uuid
import random
from typing import List, Dict, Any
from datetime import datetime
import json
from collections import defaultdict
import statistics


class LoadTestConfig:
    """Configuration for load tests"""
    BASE_URL = "http://localhost:8000"
    TOTAL_PAYMENTS = 10000
    CONCURRENT_USERS = 100
    IDEMPOTENCY_DUPLICATE_RATE = 0.2  # 20% duplicate requests
    RATE_LIMIT_TEST_USERS = 10
    RATE_LIMIT_REQUESTS_PER_USER = 150  # Exceeds limit of 100/min
    
    # User pool for testing
    USER_POOL_SIZE = 500
    AMOUNT_MIN = 10
    AMOUNT_MAX = 10000


class LoadTestMetrics:
    """Collect and analyze test metrics"""
    def __init__(self):
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.rate_limited_requests = 0
        self.idempotency_hits = 0
        self.response_times = []
        self.status_codes = defaultdict(int)
        self.errors = defaultdict(int)
        self.start_time = None
        self.end_time = None
        self.payment_ids = []
        
    def record_request(self, success: bool, response_time: float, status_code: int, 
                      error: str = None, rate_limited: bool = False, 
                      idempotency_hit: bool = False):
        """Record metrics for a single request"""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        if rate_limited:
            self.rate_limited_requests += 1
        
        if idempotency_hit:
            self.idempotency_hits += 1
            
        self.response_times.append(response_time)
        self.status_codes[status_code] += 1
        
        if error:
            self.errors[error] += 1
    
    def add_payment_id(self, payment_id: str):
        """Track created payment IDs"""
        self.payment_ids.append(payment_id)
    
    def start(self):
        """Mark test start time"""
        self.start_time = time.time()
    
    def end(self):
        """Mark test end time"""
        self.end_time = time.time()
    
    def get_summary(self) -> Dict[str, Any]:
        """Generate comprehensive test summary"""
        duration = self.end_time - self.start_time if self.end_time else 0
        
        return {
            "test_duration_seconds": round(duration, 2),
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": round(self.successful_requests / self.total_requests * 100, 2) if self.total_requests > 0 else 0,
            "rate_limited_requests": self.rate_limited_requests,
            "idempotency_cache_hits": self.idempotency_hits,
            "requests_per_second": round(self.total_requests / duration, 2) if duration > 0 else 0,
            "response_times": {
                "min_ms": round(min(self.response_times) * 1000, 2) if self.response_times else 0,
                "max_ms": round(max(self.response_times) * 1000, 2) if self.response_times else 0,
                "avg_ms": round(statistics.mean(self.response_times) * 1000, 2) if self.response_times else 0,
                "median_ms": round(statistics.median(self.response_times) * 1000, 2) if self.response_times else 0,
                "p95_ms": round(statistics.quantiles(self.response_times, n=20)[18] * 1000, 2) if len(self.response_times) > 20 else 0,
                "p99_ms": round(statistics.quantiles(self.response_times, n=100)[98] * 1000, 2) if len(self.response_times) > 100 else 0,
            },
            "status_codes": dict(self.status_codes),
            "errors": dict(self.errors),
            "unique_payments_created": len(set(self.payment_ids))
        }
    
    def print_summary(self):
        """Print formatted test summary"""
        summary = self.get_summary()
        
        print("\n" + "="*80)
        print("BULK LOAD TEST RESULTS")
        print("="*80)
        print(f"\n📊 OVERALL METRICS")
        print(f"   Duration: {summary['test_duration_seconds']}s")
        print(f"   Total Requests: {summary['total_requests']}")
        print(f"   Successful: {summary['successful_requests']} ({summary['success_rate']}%)")
        print(f"   Failed: {summary['failed_requests']}")
        print(f"   Throughput: {summary['requests_per_second']} req/s")
        
        print(f"\n⚡ RESPONSE TIMES")
        print(f"   Min: {summary['response_times']['min_ms']}ms")
        print(f"   Avg: {summary['response_times']['avg_ms']}ms")
        print(f"   Median: {summary['response_times']['median_ms']}ms")
        print(f"   P95: {summary['response_times']['p95_ms']}ms")
        print(f"   P99: {summary['response_times']['p99_ms']}ms")
        print(f"   Max: {summary['response_times']['max_ms']}ms")
        
        print(f"\n🔒 RELIABILITY FEATURES")
        print(f"   Rate Limited: {summary['rate_limited_requests']}")
        print(f"   Idempotency Hits: {summary['idempotency_cache_hits']}")
        print(f"   Unique Payments: {summary['unique_payments_created']}")
        
        print(f"\n📈 STATUS CODES")
        for code, count in sorted(summary['status_codes'].items()):
            print(f"   {code}: {count}")
        
        if summary['errors']:
            print(f"\n❌ ERRORS")
            for error, count in sorted(summary['errors'].items(), key=lambda x: x[1], reverse=True):
                print(f"   {error}: {count}")
        
        print("\n" + "="*80 + "\n")


class BulkLoadTester:
    """Main load testing class"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.metrics = LoadTestMetrics()
        self.user_pool = [f"user_{i:05d}" for i in range(config.USER_POOL_SIZE)]
        self.idempotency_keys = {}  # Track keys for duplicate testing
        
    async def create_payment(self, session: aiohttp.ClientSession, 
                            user_id: str, amount: float, 
                            idempotency_key: str = None,
                            expect_duplicate: bool = False) -> Dict[str, Any]:
        """Create a single payment with optional idempotency key"""
        url = f"{self.config.BASE_URL}/payments"
        headers = {}
        
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        
        payload = {
            "user_id": user_id,
            "amount": amount
        }
        
        start_time = time.time()
        
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                response_time = time.time() - start_time
                status_code = response.status
                
                if response.status == 201:
                    data = await response.json()
                    self.metrics.record_request(
                        success=True,
                        response_time=response_time,
                        status_code=status_code,
                        idempotency_hit=expect_duplicate
                    )
                    self.metrics.add_payment_id(data.get("payment_id", ""))
                    return {"success": True, "data": data}
                
                elif response.status == 429:
                    self.metrics.record_request(
                        success=False,
                        response_time=response_time,
                        status_code=status_code,
                        rate_limited=True,
                        error="Rate Limited"
                    )
                    return {"success": False, "error": "rate_limited"}
                
                else:
                    error_text = await response.text()
                    self.metrics.record_request(
                        success=False,
                        response_time=response_time,
                        status_code=status_code,
                        error=f"HTTP {status_code}"
                    )
                    return {"success": False, "error": error_text}
                    
        except Exception as e:
            response_time = time.time() - start_time
            self.metrics.record_request(
                success=False,
                response_time=response_time,
                status_code=0,
                error=str(type(e).__name__)
            )
            return {"success": False, "error": str(e)}
    
    async def get_payment(self, session: aiohttp.ClientSession, payment_id: str) -> Dict[str, Any]:
        """Get payment status"""
        url = f"{self.config.BASE_URL}/payments/{payment_id}"
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                else:
                    return {"success": False, "status": response.status}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def worker_create_payments(self, worker_id: int, num_payments: int, 
                                    session: aiohttp.ClientSession):
        """Worker coroutine to create multiple payments"""
        for i in range(num_payments):
            user_id = random.choice(self.user_pool)
            amount = round(random.uniform(self.config.AMOUNT_MIN, self.config.AMOUNT_MAX), 2)
            
            # Randomly decide if this should be a duplicate request (idempotency test)
            idempotency_key = None
            expect_duplicate = False
            
            if random.random() < self.config.IDEMPOTENCY_DUPLICATE_RATE:
                # Use an existing idempotency key to test duplicate detection
                if self.idempotency_keys:
                    idempotency_key = random.choice(list(self.idempotency_keys.keys()))
                    expect_duplicate = True
            
            if not expect_duplicate:
                # Generate new idempotency key
                idempotency_key = f"idem_{worker_id}_{i}_{uuid.uuid4().hex[:8]}"
                self.idempotency_keys[idempotency_key] = True
            
            await self.create_payment(session, user_id, amount, idempotency_key, expect_duplicate)
            
            # Small random delay to simulate realistic traffic
            await asyncio.sleep(random.uniform(0.001, 0.01))
    
    async def test_bulk_payments(self):
        """Test 1: Create bulk payments with concurrent workers"""
        print(f"\n🚀 TEST 1: Bulk Payment Creation")
        print(f"   Creating {self.config.TOTAL_PAYMENTS} payments with {self.config.CONCURRENT_USERS} concurrent workers...")
        
        payments_per_worker = self.config.TOTAL_PAYMENTS // self.config.CONCURRENT_USERS
        
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.worker_create_payments(i, payments_per_worker, session)
                for i in range(self.config.CONCURRENT_USERS)
            ]
            await asyncio.gather(*tasks)
        
        print(f"   ✅ Completed bulk payment creation")
    
    async def test_rate_limiting(self):
        """Test 2: Trigger rate limiting"""
        print(f"\n🔒 TEST 2: Rate Limiting")
        print(f"   Testing rate limits with {self.config.RATE_LIMIT_TEST_USERS} users...")
        print(f"   Each user will make {self.config.RATE_LIMIT_REQUESTS_PER_USER} requests (limit: 100/min)")
        
        async with aiohttp.ClientSession() as session:
            for user_idx in range(self.config.RATE_LIMIT_TEST_USERS):
                user_id = f"rate_test_user_{user_idx}"
                
                tasks = []
                for i in range(self.config.RATE_LIMIT_REQUESTS_PER_USER):
                    amount = round(random.uniform(10, 100), 2)
                    idempotency_key = f"rate_test_{user_id}_{i}"
                    tasks.append(self.create_payment(session, user_id, amount, idempotency_key))
                
                # Fire all requests rapidly to trigger rate limiting
                await asyncio.gather(*tasks)
        
        print(f"   ✅ Completed rate limiting test")
    
    async def test_idempotency_stress(self):
        """Test 3: Stress test idempotency with many duplicates"""
        print(f"\n🔄 TEST 3: Idempotency Stress Test")
        print(f"   Creating 1000 payments with 50% duplicate rate...")
        
        idempotency_key = f"stress_test_{uuid.uuid4().hex}"
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(1000):
                user_id = random.choice(self.user_pool)
                amount = round(random.uniform(10, 100), 2)
                
                # 50% chance of using the same idempotency key
                if random.random() < 0.5:
                    key = idempotency_key
                    expect_dup = i > 0  # First request is not a duplicate
                else:
                    key = f"stress_{i}_{uuid.uuid4().hex[:8]}"
                    expect_dup = False
                
                tasks.append(self.create_payment(session, user_id, amount, key, expect_dup))
            
            await asyncio.gather(*tasks)
        
        print(f"   ✅ Completed idempotency stress test")
    
    async def verify_payment_processing(self, sample_size: int = 100):
        """Test 4: Verify payments are being processed by workers"""
        print(f"\n✅ TEST 4: Payment Processing Verification")
        print(f"   Checking status of {sample_size} random payments...")
        
        if not self.metrics.payment_ids:
            print(f"   ⚠️  No payment IDs to verify")
            return
        
        sample_ids = random.sample(self.metrics.payment_ids, min(sample_size, len(self.metrics.payment_ids)))
        
        status_counts = defaultdict(int)
        
        async with aiohttp.ClientSession() as session:
            for payment_id in sample_ids:
                result = await self.get_payment(session, payment_id)
                if result["success"]:
                    status = result["data"].get("status", "UNKNOWN")
                    status_counts[status] += 1
                await asyncio.sleep(0.01)  # Small delay between checks
        
        print(f"\n   Payment Status Distribution:")
        for status, count in sorted(status_counts.items()):
            percentage = (count / sample_size) * 100
            print(f"   {status}: {count} ({percentage:.1f}%)")
        
        print(f"   ✅ Completed processing verification")
    
    async def run_all_tests(self):
        """Run complete test suite"""
        print("\n" + "="*80)
        print("PAYFLOW BULK LOAD TESTING SUITE")
        print("="*80)
        print(f"\nConfiguration:")
        print(f"  Base URL: {self.config.BASE_URL}")
        print(f"  Total Payments: {self.config.TOTAL_PAYMENTS}")
        print(f"  Concurrent Users: {self.config.CONCURRENT_USERS}")
        print(f"  User Pool Size: {self.config.USER_POOL_SIZE}")
        
        self.metrics.start()
        
        try:
            # Run all test scenarios
            await self.test_bulk_payments()
            await self.test_rate_limiting()
            await self.test_idempotency_stress()
            
            # Wait a bit for workers to process
            print(f"\n⏳ Waiting 10 seconds for worker processing...")
            await asyncio.sleep(10)
            
            await self.verify_payment_processing()
            
        finally:
            self.metrics.end()
            self.metrics.print_summary()
            
            # Save detailed results to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"load_test_results_{timestamp}.json"
            with open(filename, 'w') as f:
                json.dump(self.metrics.get_summary(), f, indent=2)
            print(f"📄 Detailed results saved to: {filename}\n")


async def main():
    """Main entry point"""
    config = LoadTestConfig()
    tester = BulkLoadTester(config)
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())

# Made with Bob
