"""
Simple Load Test - Quick validation of current implementation
Creates 1000 payments to quickly test the system
"""
import asyncio
import aiohttp
import time
import random
import uuid
from typing import Dict, Any


class SimpleLoadTest:
    """Simple load test for quick validation"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.total_requests = 0
        self.successful = 0
        self.failed = 0
        self.response_times = []
        
    async def create_payment(self, session: aiohttp.ClientSession, user_id: str, amount: float):
        """Create a single payment"""
        url = f"{self.base_url}/payments"
        payload = {"user_id": user_id, "amount": amount}
        headers = {"Idempotency-Key": f"simple_test_{uuid.uuid4().hex}"}
        
        start = time.time()
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                elapsed = time.time() - start
                self.response_times.append(elapsed)
                self.total_requests += 1
                
                if response.status == 201:
                    self.successful += 1
                    data = await response.json()
                    return {"success": True, "payment_id": data.get("payment_id")}
                else:
                    self.failed += 1
                    return {"success": False, "status": response.status}
        except Exception as e:
            self.failed += 1
            return {"success": False, "error": str(e)}
    
    async def run_test(self, num_payments: int = 1000, concurrent: int = 50):
        """Run simple load test"""
        print(f"\n{'='*60}")
        print(f"SIMPLE LOAD TEST")
        print(f"{'='*60}")
        print(f"Creating {num_payments} payments with {concurrent} concurrent workers\n")
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(num_payments):
                user_id = f"user_{random.randint(1, 100):03d}"
                amount = round(random.uniform(10, 1000), 2)
                tasks.append(self.create_payment(session, user_id, amount))
                
                # Process in batches
                if len(tasks) >= concurrent:
                    await asyncio.gather(*tasks)
                    tasks = []
            
            # Process remaining
            if tasks:
                await asyncio.gather(*tasks)
        
        duration = time.time() - start_time
        
        # Print results
        print(f"\n{'='*60}")
        print(f"RESULTS")
        print(f"{'='*60}")
        print(f"Duration: {duration:.2f}s")
        print(f"Total Requests: {self.total_requests}")
        print(f"Successful: {self.successful}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.successful/self.total_requests*100):.2f}%")
        print(f"Throughput: {self.total_requests/duration:.2f} req/s")
        
        if self.response_times:
            avg_time = sum(self.response_times) / len(self.response_times)
            print(f"Avg Response Time: {avg_time*1000:.2f}ms")
            print(f"Min Response Time: {min(self.response_times)*1000:.2f}ms")
            print(f"Max Response Time: {max(self.response_times)*1000:.2f}ms")
        
        print(f"{'='*60}\n")


async def main():
    tester = SimpleLoadTest()
    await tester.run_test(num_payments=1000, concurrent=50)


if __name__ == "__main__":
    asyncio.run(main())

# Made with Bob
