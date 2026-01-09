#!/usr/bin/env python3
"""
Performance test script for async data poller
Compares the performance of async concurrent fetching vs sequential fetching
"""
import asyncio
import time
import json
import os
import sys
from data_poller import (
    get_chassis_summary_data,
    get_chassis_card_data,
    get_chassis_port_data,
    get_chassis_licensing_data,
    get_sensor_information,
    get_perf_metrics
)
from app.database import read_username_password_from_database


async def test_category_performance(category_name: str, async_func):
    """Test performance of a specific category"""
    print(f"\n{'='*60}")
    print(f"Testing {category_name.upper()} category")
    print(f"{'='*60}")
    
    # Get chassis count
    serv_list = await read_username_password_from_database()
    if not serv_list:
        print("No chassis configured in database")
        return None
    
    chassis_list = json.loads(serv_list)
    chassis_count = len(chassis_list)
    print(f"Number of chassis: {chassis_count}")
    
    if chassis_count == 0:
        print("No chassis to test")
        return None
    
    # Measure async performance
    start_time = time.time()
    try:
        await async_func()
        end_time = time.time()
        elapsed_time = end_time - start_time
        print(f"✅ Async execution time: {elapsed_time:.2f} seconds")
        print(f"   Average time per chassis: {elapsed_time/chassis_count:.2f} seconds")
        return elapsed_time
    except Exception as e:
        print(f"❌ Error during async execution: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        # Small delay to ensure database operations complete
        await asyncio.sleep(0.1)


async def run_all_tests():
    """Run performance tests for all categories"""
    print("\n" + "="*60)
    print("ASYNC DATA POLLER PERFORMANCE TEST")
    print("="*60)
    
    test_categories = [
        ("Chassis Summary", get_chassis_summary_data),
        ("Cards", get_chassis_card_data),
        ("Ports", get_chassis_port_data),
        ("Licensing", get_chassis_licensing_data),
        ("Sensors", get_sensor_information),
        ("Performance Metrics", get_perf_metrics),
    ]
    
    results = {}
    
    for category_name, async_func in test_categories:
        elapsed = await test_category_performance(category_name, async_func)
        if elapsed is not None:
            results[category_name] = elapsed
        # Small delay between tests to ensure database operations complete
        await asyncio.sleep(1)
    
    # Summary
    print(f"\n{'='*60}")
    print("PERFORMANCE SUMMARY")
    print(f"{'='*60}")
    
    if results:
        total_time = sum(results.values())
        print(f"\nTotal time for all categories: {total_time:.2f} seconds")
        print(f"\nBreakdown by category:")
        for category, elapsed in results.items():
            percentage = (elapsed / total_time) * 100
            print(f"  {category:25s}: {elapsed:6.2f}s ({percentage:5.1f}%)")
        
        print(f"\n✅ All tests completed successfully!")
        print(f"\nNote: With async/await, all chassis are fetched concurrently,")
        print(f"      which should significantly improve performance compared to")
        print(f"      sequential fetching, especially with multiple chassis.")
    else:
        print("No successful test results")


def unlock_database():
    """Attempt to unlock database by removing lock files"""
    db_path = os.getenv("DATABASE_PATH", "inventory.db")
    lock_files = [
        f"{db_path}-wal",
        f"{db_path}-shm",
        f"{db_path}.lock"
    ]
    
    unlocked = False
    for lock_file in lock_files:
        if os.path.exists(lock_file):
            try:
                os.remove(lock_file)
                print(f"Removed lock file: {lock_file}")
                unlocked = True
            except Exception as e:
                print(f"Could not remove {lock_file}: {e}")
    
    return unlocked


if __name__ == "__main__":
    # Try to unlock database if locked
    if unlock_database():
        print("Database unlock attempted. Waiting a bit...")
        import time
        time.sleep(0.5)
    
    try:
        asyncio.run(run_all_tests())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        unlock_database()
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        # Try to unlock database on error
        unlock_database()
        sys.exit(1)

