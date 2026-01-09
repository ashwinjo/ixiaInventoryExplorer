import click
import time
import json
import asyncio
from typing import List, Dict

from app.database import (
    read_username_password_from_database, 
    write_data_to_database, 
    get_chassis_type_from_ip, 
    delete_half_data_from_performance_metric_table, 
    read_poll_setting_from_database
)
import IxOSRestAPICaller as ixOSRestCaller
from RestApi.IxOSRestInterface import IxRestSession


async def fetch_chassis_summary_for_one(chassis: Dict, retry_count: int = 3) -> Dict:
    """Fetch chassis summary data for a single chassis with retry logic and better error handling"""
    def _sync_fetch():
        import requests
        from requests.exceptions import Timeout, ConnectionError as RequestsConnectionError
        
        last_exception = None
        for attempt in range(retry_count):
            try:
                # Create session with longer timeout for slow chassis
                session = IxRestSession(
                    chassis["ip"], chassis["username"], chassis["password"], 
                    verbose=False, timeout=30)  # Increased timeout to 30 seconds
                out = ixOSRestCaller.get_chassis_information(session)
                out["chassisIp"] = chassis["ip"]
                if attempt > 0:
                    print(f"[POLL] Chassis {chassis['ip']} succeeded on retry attempt {attempt + 1}")
                return out
            except Timeout as e:
                last_exception = e
                error_msg = f"Timeout after {30 if attempt == 0 else 30 * (attempt + 1)}s"
                print(f"[POLL] Chassis {chassis['ip']} attempt {attempt + 1}/{retry_count}: {error_msg}")
                if attempt < retry_count - 1:
                    # Wait a bit before retrying (exponential backoff: 2s, 4s)
                    import time
                    wait_time = 2 * (attempt + 1)
                    time.sleep(wait_time)
                    continue
            except RequestsConnectionError as e:
                last_exception = e
                print(f"[POLL] Chassis {chassis['ip']} attempt {attempt + 1}/{retry_count}: Connection error: {str(e)}")
                if attempt < retry_count - 1:
                    import time
                    wait_time = 3 * (attempt + 1)
                    time.sleep(wait_time)
                    continue
            except Exception as e:
                last_exception = e
                error_type = type(e).__name__
                print(f"[POLL] Chassis {chassis['ip']} attempt {attempt + 1}/{retry_count}: {error_type}: {str(e)}")
                if attempt < retry_count - 1:
                    import time
                    wait_time = 2 * (attempt + 1)
                    time.sleep(wait_time)
                    continue
        
        # If all retries failed, return error response
        print(f"[POLL] Chassis {chassis['ip']} FAILED after {retry_count} attempts. Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}")
        return {
            "chassisIp": chassis["ip"],
                    "chassisSerial#": "NA",
                    "controllerSerial#": "NA",
                    "chassisType": "NA",
                    "physicalCards#": "NA",
                    "chassisStatus": "Not Reachable",
                    "lastUpdatedAt_UTC": "NA",
                    "mem_bytes": "NA", 
                    "mem_bytes_total": "NA", 
                    "cpu_pert_usage": "NA",
                    "os": "NA",
                    "IxOS": "NA",
                    "IxNetwork Protocols": "NA",
            "IxOS REST": "NA"
        }
    
    # Run the synchronous REST call in a thread pool to avoid blocking
    return await asyncio.to_thread(_sync_fetch)


async def get_chassis_summary_data():
    """This is a call to RestAPI to get chassis summary data - async version"""
    serv_list = await read_username_password_from_database()
    if serv_list:
        chassis_list = json.loads(serv_list)
        print(f"[POLL] Starting chassis data fetch for {len(chassis_list)} chassis(es)")
        # Fetch all chassis data concurrently
        tasks = [fetch_chassis_summary_for_one(chassis) for chassis in chassis_list]
        list_of_chassis = await asyncio.gather(*tasks)
        
        # Log results
        successful = [c for c in list_of_chassis if c.get("chassisStatus") != "Not Reachable"]
        failed = [c for c in list_of_chassis if c.get("chassisStatus") == "Not Reachable"]
        print(f"[POLL] Chassis fetch completed: {len(successful)} successful, {len(failed)} failed")
        if failed:
            failed_ips = [c["chassisIp"] for c in failed]
            print(f"[POLL] Failed chassis IPs: {', '.join(failed_ips)}")
        
        # Pass all results to write_data_to_database
        await write_data_to_database(
            table_name="chassis_summary_details",
            records=list_of_chassis, 
            ip_tags_dict={}
        )
        print(f"[POLL] Chassis data written to database")
    else:
        print("[POLL] No Chassis List found in database")


async def fetch_chassis_card_for_one(chassis: Dict, chassis_type: str) -> List[Dict]:
    """Fetch chassis card data for a single chassis"""
    def _sync_fetch():
        try:
            session = IxRestSession(
                chassis["ip"], chassis["username"], chassis["password"], verbose=False)
            out = ixOSRestCaller.get_chassis_cards_information(
                session, chassis["ip"], chassis_type)
            return out
        except Exception:
            return [{
                'chassisIp': chassis["ip"], 
                'chassisType': 'NA', 
                'cardNumber': 'NA', 
                'serialNumber': 'NA', 
                'cardType': 'NA', 
                'cardState': 'NA', 
                'numberOfPorts': 'NA', 
                'lastUpdatedAt_UTC': 'NA'
            }]
    
    return await asyncio.to_thread(_sync_fetch)


async def get_chassis_card_data():
    """This is a call to RestAPI to get chassis card summary data - async version"""
    serv_list = await read_username_password_from_database()
    if serv_list:
        chassis_list = json.loads(serv_list)
        # Fetch all chassis types concurrently first
        chassis_type_tasks = [get_chassis_type_from_ip(chassis["ip"]) for chassis in chassis_list]
        chassis_types = await asyncio.gather(*chassis_type_tasks)
        
        # Fetch all chassis card data concurrently
        tasks = [fetch_chassis_card_for_one(chassis, chassis_type) 
                 for chassis, chassis_type in zip(chassis_list, chassis_types)]
        results = await asyncio.gather(*tasks)
        # Keep the nested structure (list of lists) as expected by write_data_to_database
        list_of_cards = results
        
        await write_data_to_database(
            table_name="chassis_card_details",
            records=list_of_cards, 
            ip_tags_dict={}
        )


async def fetch_chassis_port_for_one(chassis: Dict, chassis_type: str) -> List[Dict]:
    """Fetch chassis port data for a single chassis"""
    def _sync_fetch():
        try:
            session = IxRestSession(
                chassis["ip"], chassis["username"], chassis["password"], verbose=False)
            out = ixOSRestCaller.get_chassis_ports_information(
                session, chassis["ip"], chassis_type)
            return out
        except Exception:
            return [{
                'owner': 'NA',
                'transceiverModel': 'NA',
                'transceiverManufacturer': 'NA',
                'portNumber': 'NA',
                'linkState': 'NA',
                'cardNumber': 'NA',
                'lastUpdatedAt_UTC': 'NA',
                'totalPorts': 'NA',
                'ownedPorts': 'NA',
                'freePorts': 'NA',
                'chassisIp': chassis["ip"],
                'typeOfChassis': 'NA',
                'transmitState': 'NA'
            }]
    
    return await asyncio.to_thread(_sync_fetch)


async def get_chassis_port_data():
    """This is a call to RestAPI to get chassis card port summary data - async version"""
    serv_list = await read_username_password_from_database()
    if serv_list:
        chassis_list = json.loads(serv_list)
        if chassis_list:
            # Fetch all chassis types concurrently first
            chassis_type_tasks = [get_chassis_type_from_ip(chassis["ip"]) for chassis in chassis_list]
            chassis_types = await asyncio.gather(*chassis_type_tasks)
            
            # Fetch all chassis port data concurrently
            tasks = [fetch_chassis_port_for_one(chassis, chassis_type) 
                     for chassis, chassis_type in zip(chassis_list, chassis_types)]
            results = await asyncio.gather(*tasks)
            # Keep the nested structure (list of lists) as expected by write_data_to_database
            port_list_details = results
            
            await write_data_to_database(
                table_name="chassis_port_details", 
                records=port_list_details
            )


async def fetch_chassis_license_for_one(chassis: Dict, chassis_type: str) -> List[Dict]:
    """Fetch chassis license data for a single chassis"""
    def _sync_fetch():
        try:
            session = IxRestSession(
                chassis["ip"], chassis["username"], chassis["password"], verbose=False)
            out = ixOSRestCaller.get_license_activation(
                session, chassis["ip"], chassis_type)
            return out
        except Exception:
            return [{
                'chassisIp': chassis["ip"],
                'typeOfChassis': 'NA',
                'hostId': 'NA',
                'partNumber': 'NA',
                'activationCode': 'NA',
                'quantity': 'NA',
                'description': 'NA',
                'maintenanceDate': 'NA',
                'expiryDate': 'NA',
                'isExpired': 'NA',
                'lastUpdatedAt_UTC': 'NA'
            }]
    
    return await asyncio.to_thread(_sync_fetch)


async def get_chassis_licensing_data():
    """This is a call to RestAPI to get chassis licensing data - async version"""
    serv_list = await read_username_password_from_database()
    if serv_list:
        chassis_list = json.loads(serv_list)
        # Fetch all chassis types concurrently first
        chassis_type_tasks = [get_chassis_type_from_ip(chassis["ip"]) for chassis in chassis_list]
        chassis_types = await asyncio.gather(*chassis_type_tasks)
        
        # Fetch all chassis license data concurrently
        tasks = [fetch_chassis_license_for_one(chassis, chassis_type) 
                 for chassis, chassis_type in zip(chassis_list, chassis_types)]
        results = await asyncio.gather(*tasks)
        # Keep the nested structure (list of lists) as expected by write_data_to_database
        list_of_licenses = results
        
        await write_data_to_database(
            table_name="license_details_records", 
            records=list_of_licenses
        )


async def fetch_sensor_info_for_one(chassis: Dict, chassis_type: str) -> List[Dict]:
    """Fetch sensor information for a single chassis"""
    def _sync_fetch():
        try:
            session = IxRestSession(
                chassis["ip"], chassis["username"], chassis["password"], verbose=False)
            out = ixOSRestCaller.get_sensor_information(
                session, chassis["ip"], chassis_type)
            return out
        except Exception:
            return [{
                'type': 'NA',
                'unit': 'NA',
                'name': 'NA',
                'value': 'NA',
                'chassisIp': chassis["ip"],
                'typeOfChassis': 'NA',
                'lastUpdatedAt_UTC': 'NA'
            }]
    
    return await asyncio.to_thread(_sync_fetch)


async def get_sensor_information():
    """This is a call to RestAPI to get chassis sensors summary data - async version"""
    serv_list = await read_username_password_from_database()
    if serv_list:
        chassis_list = json.loads(serv_list)
        # Fetch all chassis types concurrently first
        chassis_type_tasks = [get_chassis_type_from_ip(chassis["ip"]) for chassis in chassis_list]
        chassis_types = await asyncio.gather(*chassis_type_tasks)
        
        # Fetch all chassis sensor data concurrently
        tasks = [fetch_sensor_info_for_one(chassis, chassis_type) 
                 for chassis, chassis_type in zip(chassis_list, chassis_types)]
        results = await asyncio.gather(*tasks)
        # Keep the nested structure (list of lists) as expected by write_data_to_database
        sensor_list_details = results
        
        await write_data_to_database(
            table_name="chassis_sensor_details", 
            records=sensor_list_details
        )


async def fetch_perf_metrics_for_one(chassis: Dict) -> Dict:
    """Fetch performance metrics for a single chassis"""
    def _sync_fetch():
        try:
            session = IxRestSession(
                chassis["ip"], chassis["username"], chassis["password"], verbose=False)
            out = ixOSRestCaller.get_perf_metrics(session, chassis["ip"])
            return out
        except Exception:
            return {
                'chassisIp': chassis["ip"], 
                'mem_utilization': 0, 
                'cpu_utilization': 0, 
                'lastUpdatedAt_UTC': '03/15/2023, 03:31:47'
            }
    
    return await asyncio.to_thread(_sync_fetch)


async def get_perf_metrics():
    """This is a call to RestAPI to get chassis performance metrics data - async version"""
    serv_list = await read_username_password_from_database()
    perf_list_details = []
    if serv_list:
        chassis_list = json.loads(serv_list)
        # Fetch all chassis performance metrics concurrently
        tasks = [fetch_perf_metrics_for_one(chassis) for chassis in chassis_list]
        perf_list_details = await asyncio.gather(*tasks)
        
        await write_data_to_database(
            table_name="chassis_utilization_details", 
            records=perf_list_details
        )
        

async def delete_half_metric_records_weekly():
    """This method will do periodic cleanup of inventord DB performance metrics data"""
    await delete_half_data_from_performance_metric_table()


async def controller(category_of_poll=None):
    """Async controller function"""
    await categoryToFuntionMap[category_of_poll]()


categoryToFuntionMap = {
    "chassis": get_chassis_summary_data,
                        "cards": get_chassis_card_data,
                        "ports": get_chassis_port_data,
                        "licensing": get_chassis_licensing_data,
                        "sensors": get_sensor_information,
                        "perf": get_perf_metrics,
    "data_purge": delete_half_metric_records_weekly
}


@click.command()
@click.option('--category', default="", help='What chassis aspect to poll. chassis, cards, ports, licensing')
@click.option('--interval', default="", help='Interval between Polls')
def start_poller(category, interval): 
    """Since not all the parameters are modified with same interval, this way, we can specify exactly what we want to monitor at what interval
  Args:
        category (_type_): _description_
        interval (_type_): _description_
    """
    if not category:
        print("Error: --category is required. Options: chassis, cards, ports, licensing, sensors, perf, data_purge")
        return
    
    if category not in categoryToFuntionMap:
        print(f"Error: Invalid category '{category}'. Options: {', '.join(categoryToFuntionMap.keys())}")
        return
    
    # Default intervals (in seconds) if not provided
    default_intervals = {
        "chassis": 60,
        "cards": 120,
        "ports": 120,
        "licensing": 300,
        "sensors": 180,
        "perf": 60,
        "data_purge": 86400
    }
    
    while True:
        poll_interval = asyncio.run(read_poll_setting_from_database())
        if poll_interval and category in poll_interval:
            interval = poll_interval[category]
        elif not interval or interval == "":
            # Use default if not set
            interval = default_intervals.get(category, 60)
        
        try:
            # Convert to int and handle data_purge special case
            interval_seconds = int(interval)
            if category == "data_purge":
                interval_seconds = interval_seconds * 24 * 60 * 60  # Convert days to seconds
            
            # Execute the polling function
            asyncio.run(categoryToFuntionMap[category]())
            
            # Sleep for the interval
            time.sleep(interval_seconds)
        except ValueError:
            print(f"Error: Invalid interval value '{interval}'. Using default for category '{category}'.")
            interval = default_intervals.get(category, 60)
            time.sleep(int(interval))
        except Exception as e:
            print(f"Error during polling for category '{category}': {e}")
            import traceback
            traceback.print_exc()
            # Sleep a bit before retrying
            time.sleep(60)


if __name__ == '__main__':
    start_poller()
