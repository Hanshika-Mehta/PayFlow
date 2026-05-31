"""
Detailed Report Generator for Load Testing
Generates comprehensive HTML reports with component-level analysis
"""
import json
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, Any, List
import statistics


class ComponentAnalyzer:
    """Analyze individual components in detail"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        
    async def analyze_database(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze database performance and health"""
        analysis = {
            "component": "PostgreSQL Database",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            # Get payment statistics
            async with session.get(f"{self.base_url}/monitoring/database") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "total_payments": data.get("total_payments", 0),
                        "pending_payments": data.get("pending", 0),
                        "processing_payments": data.get("processing", 0),
                        "successful_payments": data.get("success", 0),
                        "failed_payments": data.get("failed", 0),
                        "avg_query_time_ms": data.get("avg_query_time_ms", 0),
                        "connection_pool_size": data.get("pool_size", 0),
                        "active_connections": data.get("active_connections", 0)
                    }
                    
                    # Analyze issues
                    if data.get("pending", 0) > 1000:
                        analysis["issues"].append("High number of pending payments (>1000)")
                        analysis["recommendations"].append("Check worker processing capacity")
                    
                    if data.get("avg_query_time_ms", 0) > 100:
                        analysis["issues"].append(f"Slow queries detected (avg: {data.get('avg_query_time_ms')}ms)")
                        analysis["recommendations"].append("Add database indexes on frequently queried columns")
                        analysis["recommendations"].append("Consider query optimization")
                    
                    if data.get("failed", 0) / max(data.get("total_payments", 1), 1) > 0.1:
                        analysis["issues"].append("High failure rate (>10%)")
                        analysis["recommendations"].append("Review error logs for database connection issues")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch database metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to database monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_redis_queue(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze Redis queue performance"""
        analysis = {
            "component": "Redis Queue (Streams)",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/queue") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "pending_messages": data.get("pending_count", 0),
                        "processing_messages": data.get("processing_count", 0),
                        "total_processed": data.get("total_processed", 0),
                        "queue_lag_seconds": data.get("lag_seconds", 0),
                        "messages_per_second": data.get("throughput", 0),
                        "oldest_message_age_seconds": data.get("oldest_message_age", 0)
                    }
                    
                    # Analyze issues
                    lag = data.get("lag_seconds", 0)
                    if lag > 30:
                        analysis["issues"].append(f"Critical queue lag detected ({lag}s)")
                        analysis["recommendations"].append("Scale workers immediately (add 2-3 more workers)")
                        analysis["recommendations"].append("Check worker logs for processing bottlenecks")
                    elif lag > 10:
                        analysis["issues"].append(f"High queue lag ({lag}s)")
                        analysis["recommendations"].append("Consider adding 1-2 more workers")
                    
                    if data.get("pending_count", 0) > 5000:
                        analysis["issues"].append(f"Large queue backlog ({data.get('pending_count')} messages)")
                        analysis["recommendations"].append("Workers cannot keep up with incoming load")
                    
                    if data.get("throughput", 0) < 10:
                        analysis["issues"].append("Low processing throughput (<10 msg/s)")
                        analysis["recommendations"].append("Check worker performance and optimize processing logic")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch queue metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to queue monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_workers(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze worker performance"""
        analysis = {
            "component": "Payment Workers",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/workers") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "active_workers": data.get("active_workers", 0),
                        "total_processed": data.get("total_processed", 0),
                        "success_rate": data.get("success_rate", 0),
                        "avg_processing_time_ms": data.get("avg_processing_time_ms", 0),
                        "messages_per_second": data.get("throughput", 0),
                        "current_load": data.get("current_load", 0)
                    }
                    
                    # Analyze issues
                    if data.get("active_workers", 0) == 0:
                        analysis["issues"].append("No active workers detected!")
                        analysis["recommendations"].append("Start worker process: python -m app.workers.payment_worker")
                    elif data.get("active_workers", 0) == 1:
                        analysis["issues"].append("Only 1 worker running")
                        analysis["recommendations"].append("Consider running 2-3 workers for better throughput")
                    
                    if data.get("success_rate", 100) < 90:
                        analysis["issues"].append(f"Low success rate ({data.get('success_rate')}%)")
                        analysis["recommendations"].append("Review worker error logs")
                        analysis["recommendations"].append("Check external service connectivity")
                    
                    if data.get("avg_processing_time_ms", 0) > 1000:
                        analysis["issues"].append(f"Slow processing time ({data.get('avg_processing_time_ms')}ms)")
                        analysis["recommendations"].append("Optimize payment processing logic")
                        analysis["recommendations"].append("Check for blocking I/O operations")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch worker metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to worker monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_retry_mechanism(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze retry mechanism performance"""
        analysis = {
            "component": "Retry Mechanism",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/retries") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "total_retries": data.get("total_retries", 0),
                        "retry_rate": data.get("retry_rate", 0),
                        "avg_retry_count": data.get("avg_retry_count", 0),
                        "max_retry_count": data.get("max_retry_count", 0),
                        "successful_after_retry": data.get("successful_after_retry", 0),
                        "failed_after_max_retries": data.get("failed_after_max_retries", 0)
                    }
                    
                    # Analyze issues
                    if data.get("retry_rate", 0) > 50:
                        analysis["issues"].append(f"Very high retry rate ({data.get('retry_rate')}%)")
                        analysis["recommendations"].append("Investigate root cause of failures")
                        analysis["recommendations"].append("Check if FAILURE_RATE simulation is too high")
                    
                    if data.get("failed_after_max_retries", 0) > 100:
                        analysis["issues"].append(f"Many payments failing after max retries ({data.get('failed_after_max_retries')})")
                        analysis["recommendations"].append("Review DLQ for permanent failure patterns")
                        analysis["recommendations"].append("Consider increasing MAX_RETRIES if failures are transient")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch retry metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to retry monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_dlq(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze Dead Letter Queue"""
        analysis = {
            "component": "Dead Letter Queue (DLQ)",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/dlq") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "total_messages": data.get("total_messages", 0),
                        "recent_failures": data.get("recent_count", 0),
                        "failure_rate": data.get("failure_rate", 0),
                        "common_errors": data.get("common_errors", [])
                    }
                    
                    # Analyze issues
                    if data.get("total_messages", 0) > 1000:
                        analysis["issues"].append(f"Large number of permanent failures ({data.get('total_messages')})")
                        analysis["recommendations"].append("Review DLQ messages for patterns")
                        analysis["recommendations"].append("Implement DLQ replay mechanism for recoverable failures")
                    
                    if data.get("failure_rate", 0) > 10:
                        analysis["issues"].append(f"High permanent failure rate ({data.get('failure_rate')}%)")
                        analysis["recommendations"].append("Investigate root causes in DLQ messages")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch DLQ metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to DLQ monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_idempotency(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze idempotency mechanism"""
        analysis = {
            "component": "Idempotency Protection",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/idempotency") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "total_keys": data.get("total_keys", 0),
                        "cache_hits": data.get("cache_hits", 0),
                        "cache_misses": data.get("cache_misses", 0),
                        "hit_rate": data.get("hit_rate", 0),
                        "duplicate_requests_prevented": data.get("duplicates_prevented", 0)
                    }
                    
                    # Analyze issues
                    if data.get("cache_hits", 0) == 0 and data.get("total_keys", 0) > 0:
                        analysis["issues"].append("No cache hits detected - idempotency may not be working")
                        analysis["recommendations"].append("Verify Idempotency-Key header is being sent")
                        analysis["recommendations"].append("Check Redis for idempotency keys")
                    
                    if data.get("hit_rate", 0) > 50:
                        analysis["issues"].append(f"Very high cache hit rate ({data.get('hit_rate')}%)")
                        analysis["recommendations"].append("May indicate excessive duplicate requests from clients")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch idempotency metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to idempotency monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_rate_limiting(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Analyze rate limiting"""
        analysis = {
            "component": "Rate Limiting",
            "status": "unknown",
            "metrics": {},
            "issues": [],
            "recommendations": []
        }
        
        try:
            async with session.get(f"{self.base_url}/monitoring/rate-limits") as response:
                if response.status == 200:
                    data = await response.json()
                    analysis["status"] = "healthy"
                    analysis["metrics"] = {
                        "enabled": data.get("enabled", False),
                        "total_requests": data.get("total_requests", 0),
                        "allowed_requests": data.get("allowed", 0),
                        "blocked_requests": data.get("blocked", 0),
                        "block_rate": data.get("block_rate", 0),
                        "per_user_limit": data.get("per_user_limit", 0),
                        "per_ip_limit": data.get("per_ip_limit", 0)
                    }
                    
                    # Analyze issues
                    if not data.get("enabled", False):
                        analysis["issues"].append("Rate limiting is DISABLED")
                        analysis["recommendations"].append("Enable for production: RATE_LIMIT_ENABLED=true")
                    
                    if data.get("block_rate", 0) > 20:
                        analysis["issues"].append(f"High block rate ({data.get('block_rate')}%)")
                        analysis["recommendations"].append("Consider increasing rate limits if legitimate traffic")
                        analysis["recommendations"].append("Or investigate potential abuse")
                else:
                    analysis["status"] = "error"
                    analysis["issues"].append(f"Failed to fetch rate limit metrics (HTTP {response.status})")
        except Exception as e:
            analysis["status"] = "error"
            analysis["issues"].append(f"Error connecting to rate limit monitoring: {str(e)}")
        
        return analysis
    
    async def analyze_all_components(self) -> List[Dict[str, Any]]:
        """Analyze all components"""
        async with aiohttp.ClientSession() as session:
            analyses = await asyncio.gather(
                self.analyze_database(session),
                self.analyze_redis_queue(session),
                self.analyze_workers(session),
                self.analyze_retry_mechanism(session),
                self.analyze_dlq(session),
                self.analyze_idempotency(session),
                self.analyze_rate_limiting(session)
            )
        return list(analyses)


class ReportGenerator:
    """Generate detailed HTML reports"""
    
    def __init__(self):
        self.analyzer = ComponentAnalyzer()
    
    def generate_html_report(self, test_results: Dict[str, Any], 
                            component_analyses: List[Dict[str, Any]]) -> str:
        """Generate comprehensive HTML report"""
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Calculate overall health score
        healthy_components = sum(1 for c in component_analyses if c["status"] == "healthy")
        total_components = len(component_analyses)
        health_score = (healthy_components / total_components * 100) if total_components > 0 else 0
        
        # Determine health status color
        if health_score >= 90:
            health_color = "#10b981"  # green
            health_status = "Excellent"
        elif health_score >= 70:
            health_color = "#f59e0b"  # yellow
            health_status = "Good"
        elif health_score >= 50:
            health_color = "#f97316"  # orange
            health_status = "Fair"
        else:
            health_color = "#ef4444"  # red
            health_status = "Poor"
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayFlow Load Test Report - {timestamp}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f3f4f6;
            color: #1f2937;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .header .subtitle {{
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .health-score {{
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .health-score h2 {{
            color: #374151;
            margin-bottom: 20px;
        }}
        
        .score-circle {{
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: conic-gradient({health_color} {health_score}%, #e5e7eb {health_score}%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            position: relative;
        }}
        
        .score-circle::before {{
            content: '';
            width: 160px;
            height: 160px;
            border-radius: 50%;
            background: white;
            position: absolute;
        }}
        
        .score-value {{
            font-size: 3em;
            font-weight: bold;
            color: {health_color};
            z-index: 1;
        }}
        
        .score-label {{
            font-size: 1.2em;
            color: #6b7280;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .summary-card {{
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .summary-card h3 {{
            color: #6b7280;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
        }}
        
        .summary-card .value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #1f2937;
        }}
        
        .summary-card .label {{
            color: #9ca3af;
            font-size: 0.9em;
        }}
        
        .component-section {{
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .component-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }}
        
        .component-title {{
            font-size: 1.5em;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .status-badge {{
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .status-healthy {{
            background: #d1fae5;
            color: #065f46;
        }}
        
        .status-error {{
            background: #fee2e2;
            color: #991b1b;
        }}
        
        .status-unknown {{
            background: #e5e7eb;
            color: #374151;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }}
        
        .metric-item {{
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }}
        
        .metric-label {{
            color: #6b7280;
            font-size: 0.85em;
            margin-bottom: 5px;
        }}
        
        .metric-value {{
            font-size: 1.5em;
            font-weight: bold;
            color: #1f2937;
        }}
        
        .issues-section {{
            margin-top: 20px;
        }}
        
        .issue-item {{
            padding: 15px;
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            margin-bottom: 10px;
        }}
        
        .issue-item::before {{
            content: '⚠️ ';
            margin-right: 8px;
        }}
        
        .recommendations-section {{
            margin-top: 20px;
        }}
        
        .recommendation-item {{
            padding: 15px;
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            border-radius: 8px;
            margin-bottom: 10px;
        }}
        
        .recommendation-item::before {{
            content: '💡 ';
            margin-right: 8px;
        }}
        
        .no-issues {{
            padding: 15px;
            background: #f0fdf4;
            border-radius: 8px;
            color: #065f46;
            text-align: center;
        }}
        
        .footer {{
            text-align: center;
            padding: 30px;
            color: #6b7280;
            margin-top: 40px;
        }}
        
        @media print {{
            body {{
                background: white;
            }}
            .container {{
                max-width: 100%;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 PayFlow Load Test Report</h1>
            <div class="subtitle">Generated on {timestamp}</div>
        </div>
        
        <div class="health-score">
            <h2>Overall System Health</h2>
            <div class="score-circle">
                <div class="score-value">{health_score:.0f}%</div>
            </div>
            <div class="score-label">{health_status}</div>
            <p style="margin-top: 15px; color: #6b7280;">
                {healthy_components} of {total_components} components healthy
            </p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Requests</h3>
                <div class="value">{test_results.get('total_requests', 0):,}</div>
                <div class="label">requests processed</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">{test_results.get('success_rate', 0):.1f}%</div>
                <div class="label">successful requests</div>
            </div>
            <div class="summary-card">
                <h3>Throughput</h3>
                <div class="value">{test_results.get('requests_per_second', 0):.0f}</div>
                <div class="label">requests/second</div>
            </div>
            <div class="summary-card">
                <h3>Avg Response Time</h3>
                <div class="value">{test_results.get('response_times', {}).get('avg_ms', 0):.0f}ms</div>
                <div class="label">average latency</div>
            </div>
        </div>
"""
        
        # Add component analyses
        for component in component_analyses:
            status_class = f"status-{component['status']}"
            
            html += f"""
        <div class="component-section">
            <div class="component-header">
                <div class="component-title">
                    {component['component']}
                </div>
                <span class="status-badge {status_class}">{component['status']}</span>
            </div>
"""
            
            # Add metrics
            if component['metrics']:
                html += """
            <div class="metrics-grid">
"""
                for key, value in component['metrics'].items():
                    label = key.replace('_', ' ').title()
                    if isinstance(value, float):
                        formatted_value = f"{value:.2f}"
                    elif isinstance(value, bool):
                        formatted_value = "✓" if value else "✗"
                    else:
                        formatted_value = f"{value:,}" if isinstance(value, int) else str(value)
                    
                    html += f"""
                <div class="metric-item">
                    <div class="metric-label">{label}</div>
                    <div class="metric-value">{formatted_value}</div>
                </div>
"""
                html += """
            </div>
"""
            
            # Add issues
            if component['issues']:
                html += """
            <div class="issues-section">
                <h4 style="color: #ef4444; margin-bottom: 10px;">⚠️ Issues Detected</h4>
"""
                for issue in component['issues']:
                    html += f"""
                <div class="issue-item">{issue}</div>
"""
                html += """
            </div>
"""
            
            # Add recommendations
            if component['recommendations']:
                html += """
            <div class="recommendations-section">
                <h4 style="color: #10b981; margin-bottom: 10px;">💡 Recommendations</h4>
"""
                for rec in component['recommendations']:
                    html += f"""
                <div class="recommendation-item">{rec}</div>
"""
                html += """
            </div>
"""
            
            # No issues message
            if not component['issues'] and not component['recommendations']:
                html += """
            <div class="no-issues">
                ✅ No issues detected - component is performing optimally
            </div>
"""
            
            html += """
        </div>
"""
        
        html += """
        <div class="footer">
            <p>PayFlow Load Testing Suite</p>
            <p style="margin-top: 10px; font-size: 0.9em;">
                For questions or issues, review the testing documentation
            </p>
        </div>
    </div>
</body>
</html>
"""
        return html
    
    async def generate_report(self, test_results_file: str = None) -> str:
        """Generate complete report"""
        # Load test results
        test_results = {}
        if test_results_file:
            try:
                with open(test_results_file, 'r') as f:
                    test_results = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load test results: {e}")
        
        # Analyze all components
        print("Analyzing components...")
        component_analyses = await self.analyzer.analyze_all_components()
        
        # Generate HTML report
        html = self.generate_html_report(test_results, component_analyses)
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"load_test_report_{timestamp}.html"
        
        with open(filename, 'w') as f:
            f.write(html)
        
        print(f"\n✅ Detailed report generated: {filename}")
        print(f"   Open in browser to view comprehensive analysis")
        
        return filename


async def main():
    """Main entry point"""
    import sys
    
    generator = ReportGenerator()
    
    # Check if test results file provided
    test_results_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    await generator.generate_report(test_results_file)


if __name__ == "__main__":
    asyncio.run(main())

# Made with Bob
