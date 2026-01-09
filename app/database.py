"""
Async database utilities for SQLite
"""
import aiosqlite
import json
import os
import asyncio
from typing import List, Dict, Optional, Any

DATABASE_PATH = os.getenv("DATABASE_PATH", "inventory.db")

# Semaphore to limit concurrent database writes and prevent locking
# SQLite doesn't handle concurrent writes well, so we serialize them
_db_write_semaphore = asyncio.Semaphore(1)

# Semaphore for reads - allows more concurrency
_db_read_semaphore = asyncio.Semaphore(10)


async def get_db_connection(timeout: float = 30.0):
    """Get async connection to sqlite3 database with timeout"""
    conn = await aiosqlite.connect(DATABASE_PATH, timeout=timeout)
    conn.row_factory = aiosqlite.Row
    # Enable WAL mode for better concurrency
    try:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.commit()
    except Exception:
        pass  # If WAL is not supported, continue with default mode
    return conn


async def write_data_to_database(table_name: str, records: List[Dict], ip_tags_dict: Optional[Dict] = None):
    """Write polled data inside sqlite3 DB with proper error handling"""
    # Use semaphore to serialize writes and prevent database locking
    async with _db_write_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            tags = ""
            
            # For chassis_summary_details, use selective update with grace period for failures
            # This ensures we only update records we actually polled, preventing race conditions
            # where background poller overwrites data from manual refresh
            if table_name == "chassis_summary_details":
                # Get list of IPs we're updating
                chassis_ips_to_update = [r["chassisIp"] for r in records]
                
                # For failed chassis, check if we have recent good data (within last 5 minutes)
                # If so, preserve the good data instead of overwriting with "Not Reachable"
                failed_chassis = [r for r in records if r.get("chassisStatus") == "Not Reachable"]
                successful_chassis = [r for r in records if r.get("chassisStatus") != "Not Reachable"]
                
                # Get existing data for failed chassis to check timestamps
                if failed_chassis:
                    failed_ips = [r["chassisIp"] for r in failed_chassis]
                    placeholders_failed = ','.join('?' * len(failed_ips))
                    cursor = await conn.execute(
                        f"SELECT ip, lastUpdatedAt_UTC, status_status FROM {table_name} WHERE ip IN ({placeholders_failed})",
                        failed_ips
                    )
                    existing_failed = await cursor.fetchall()
                    await cursor.close()
                    
                    # Filter out failed chassis that have recent good data (within 5 minutes)
                    # This prevents overwriting good data with temporary failures
                    from datetime import datetime, timedelta
                    grace_period = timedelta(minutes=5)
                    now = datetime.now()
                    
                    chassis_to_skip = set()
                    for existing in existing_failed:
                        ip = existing["ip"]
                        last_updated_str = existing["lastUpdatedAt_UTC"]
                        status = existing.get("status_status", "")
                        
                        # Only preserve if status was good (not "Not Reachable") and data is recent
                        if status != "Not Reachable" and status and last_updated_str:
                            try:
                                # Try parsing different datetime formats
                                try:
                                    last_updated = datetime.strptime(last_updated_str, "%Y-%m-%d %H:%M:%S")
                                except:
                                    try:
                                        last_updated = datetime.strptime(last_updated_str, "%m/%d/%Y, %H:%M:%S")
                                    except:
                                        # If we can't parse, skip preservation logic
                                        continue
                                
                                if now - last_updated < grace_period:
                                    chassis_to_skip.add(ip)
                                    print(f"[DB] Preserving recent good data for {ip} (updated {last_updated_str}, status: {status})")
                            except Exception as e:
                                # If datetime parsing fails, continue without preserving
                                pass
                    
                    # Filter out chassis we're skipping from failed list
                    failed_chassis = [r for r in failed_chassis if r["chassisIp"] not in chassis_to_skip]
                    # Add skipped chassis back to records to process as successful (preserve existing)
                    for existing in existing_failed:
                        if existing["ip"] in chassis_to_skip:
                            # Don't add back, we'll keep the existing record
                            pass
                
                # Delete only records for IPs we're actually updating (successful + failed without grace period)
                all_update_ips = [r["chassisIp"] for r in successful_chassis + failed_chassis]
                if all_update_ips:
                    placeholders = ','.join('?' * len(all_update_ips))
                    await conn.execute(f"DELETE FROM {table_name} WHERE ip IN ({placeholders})", all_update_ips)
                
                # Insert successful records and failed records (that didn't have recent good data)
                for record in (successful_chassis + failed_chassis):
                    if ip_tags_dict:
                        tags = ip_tags_dict.get(record["chassisIp"])
                        if tags:
                            tags = ",".join(tags)
                        else:
                            tags = ""
                    else:
                        tags = ""
                    
                    record.update({"tags": tags})
                    
                    # Insert all records, including failed ones with "Not Reachable" status
                    # This ensures the UI always shows the latest state for polled chassis
                    await conn.execute(f"""INSERT INTO {table_name} (ip, chassisSN, controllerSN, type_of_chassis, 
                        physicalCards, status_status, ixOS, ixNetwork_Protocols, ixOS_REST, tags, lastUpdatedAt_UTC, 
                        mem_bytes, mem_bytes_total, cpu_pert_usage, os) VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)""",
                        (record["chassisIp"], record['chassisSerial#'],
                        record['controllerSerial#'], record['chassisType'], record['physicalCards#'],
                        record['chassisStatus'],
                        record.get('IxOS', "NA"), record.get('IxNetwork Protocols',"NA"), record.get('IxOS REST',"NA"), record['tags'], 
                        record.get('mem_bytes', '0'), record.get('mem_bytes_total', '0'), record.get('cpu_pert_usage', '0'),
                        record['os']))
            elif table_name != "chassis_utilization_details":
                # For other tables, clear all records as before
                await conn.execute(f"DELETE FROM {table_name}")
        
                # Process other table types (only if not chassis_summary_details, which we handled above)
                for record in records:
                    if table_name == "license_details_records":
                        for rcd in record:
                            await conn.execute(f"""INSERT INTO {table_name} (chassisIp, typeOfChassis, hostId, partNumber, 
                                activationCode, quantity, description, maintenanceDate, expiryDate, isExpired, lastUpdatedAt_UTC) VALUES 
                                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                                (rcd["chassisIp"], rcd["typeOfChassis"],
                                rcd["hostId"], rcd["partNumber"],
                                rcd["activationCode"], str(rcd["quantity"]), rcd["description"],
                                rcd["maintenanceDate"], rcd["expiryDate"], str(rcd["isExpired"])))
                    
                    if table_name == "chassis_card_details":
                        for rcd in record:
                            if ip_tags_dict:
                                tags = ip_tags_dict.get(rcd.get("chassisIp"))
                                if tags:
                                    tags = ",".join(tags)
                                else:
                                    tags = ""
                            else:
                                tags = ""    
                            rcd.update({"tags": tags})
                            await conn.execute(f"""INSERT INTO {table_name} (chassisIp,typeOfChassis,cardNumber,serialNumber,cardType,cardState,numberOfPorts,tags,
                                lastUpdatedAt_UTC) VALUES 
                                (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                                (rcd["chassisIp"], rcd["chassisType"], rcd["cardNumber"], rcd["serialNumber"],
                                rcd["cardType"], rcd["cardState"], rcd["numberOfPorts"], rcd['tags']))
                    
                    if table_name == "chassis_port_details":
                        for rcd in record:
                            await conn.execute(f"""INSERT INTO {table_name} (chassisIp,typeOfChassis,cardNumber,portNumber,linkState,phyMode,transceiverModel,
                                transceiverManufacturer,owner, speed, type, totalPorts,ownedPorts,freePorts, transmitState, lastUpdatedAt_UTC) VALUES 
                                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                                (rcd["chassisIp"], rcd["typeOfChassis"], rcd["cardNumber"], rcd["portNumber"], rcd.get("linkState", "NA"),
                                rcd.get("phyMode","NA"), rcd.get("transceiverModel", "NA"), rcd.get("transceiverManufacturer", "NA"), rcd["owner"],
                                rcd.get("speed", "NA"), rcd.get("type", "NA"), rcd["totalPorts"], rcd["ownedPorts"], rcd["freePorts"], rcd.get('transmitState','NA')))
                    
                    if table_name == "chassis_sensor_details":
                        for rcd in record:
                            unit = rcd["unit"]
                            if rcd["unit"] == "CELSIUS": 
                                unit = f'{rcd["value"]} {chr(176)}C'
                            if rcd["unit"] == "AMPERSEND": 
                                unit = "AMP"
                            await conn.execute(f"""INSERT INTO {table_name} (chassisIp,typeOfChassis,sensorType,sensorName,sensorValue,unit,lastUpdatedAt_UTC) VALUES 
                                (?, ?, ?, ?, ?, ?, datetime('now'))""",
                                (rcd["chassisIp"], rcd["typeOfChassis"], rcd.get("type", "NA"), rcd["name"],
                                rcd["value"], unit))
            
            if table_name == "chassis_utilization_details":
                for record in records:
                    await conn.execute(f"""INSERT INTO {table_name} (chassisIp,mem_utilization,cpu_utilization,lastUpdatedAt_UTC) VALUES 
                        (?, ?, ?, ?)""",
                        (record["chassisIp"], record["mem_utilization"], record["cpu_utilization"], record["lastUpdatedAt_UTC"]))
            
            await conn.commit()
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def read_data_from_database(table_name: str) -> List[Dict]:
    """Read polled data from sqlite3 DB"""
    async with _db_read_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            cursor = await conn.execute(f"SELECT * FROM {table_name}")
            rows = await cursor.fetchall()
            
            # Convert Row objects to dictionaries
            records = [dict(row) for row in rows]
            return records
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def write_tags(ip: str, tags: str, type_of_update: str, operation: str) -> str:
    """Write tags to sqlite3 DB"""
    async with _db_write_semaphore:
        conn = None
        try:
            updated_tags = ""
            if type_of_update == "chassis":
                table = 'user_ip_tags'
                field = 'ip'
            elif type_of_update == "card":
                table = 'user_card_tags'
                field = 'serialNumber'
            else:
                return "Invalid type_of_update"
            
            conn = await get_db_connection()
            
            # Get Present Tags from DB
            ip_tags_dict = await read_tags(type_of_update)
            currenttags = ip_tags_dict.get(ip)
            new_tags = tags.split(",")
            
            # There is a record present
            if currenttags: 
                if operation == "add":
                    updated_tags = ",".join(currenttags + new_tags)
                elif operation == "remove":
                    for t in new_tags:
                        if t in currenttags:
                            currenttags.remove(t)
                    updated_tags = ",".join(currenttags)
                
                await conn.execute(f"UPDATE {table} SET tags = ? where {field} = ?", (updated_tags, ip))
                if type_of_update == "chassis":
                    await conn.execute(f"UPDATE chassis_summary_details SET tags = ? where ip = ?", (updated_tags, ip))
            else:  # New Record
                await conn.execute(f"INSERT INTO {table} ({field}, tags) VALUES (?, ?)", (ip, tags))
            
            await conn.commit()
            return "Records successfully updated"
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
        

async def read_tags(type_of_update: str) -> Dict[str, List[str]]:
    """Read tags from sqlite3 DB"""
    async with _db_read_semaphore:
        conn = None
        try:
            ip_tags_dict = {}
            if type_of_update == "chassis":
                table = "user_ip_tags"
                field = "ip"
            elif type_of_update == "card":
                table = "user_card_tags"
                field = "serialNumber"
            else:
                return {}
            
            conn = await get_db_connection()
            cursor = await conn.execute(f"SELECT * FROM {table}")
            posts = await cursor.fetchall()
            
            for post in posts:
                tags_str = post["tags"] if post["tags"] else ""
                ip_tags_dict.update({post[field]: tags_str.split(",") if tags_str else []})
            return ip_tags_dict
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def get_chassis_type_from_ip(chassisIp: str) -> str:
    """Get type of Ixia Chassis from IP"""
    async with _db_read_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            cursor = await conn.execute(f"SELECT type_of_chassis FROM chassis_summary_details where ip = ?", (chassisIp,))
            post = await cursor.fetchone()
            if post:
                return post['type_of_chassis']
            return "NA"
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
    

async def write_username_password_to_database(list_of_un_pw: str):
    """Write user information about ixia servers into database"""
    async with _db_write_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            await conn.execute("DELETE from user_db")
            user_pw_dict = await create_config_dict(list_of_un_pw)
            user_pw_dict = list({v['ip']:v for v in user_pw_dict}.values())
            json_str_data = json.dumps(user_pw_dict)
            await conn.execute(f"INSERT INTO user_db (ixia_servers_json) VALUES (?)", (json_str_data,))
            await conn.commit()
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
   
    
async def read_username_password_from_database() -> str:
    """Read user information about ixia servers from database"""
    async with _db_read_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            cursor = await conn.execute("SELECT * FROM user_db")
            post = await cursor.fetchone()
            if post:
                return post['ixia_servers_json']
            return "[]"
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def create_config_dict(list_of_un_pw: str) -> List[Dict]:
    """Helper function to assist with writing json into DB based on user ADD/DELETE"""
    config_now_str = await read_username_password_from_database()
    # Converting String to List
    config = list_of_un_pw.split("\n")
    config_now = []
    
    if config_now_str:
        config_now = json.loads(config_now_str)
        for item in config:
            if item:
                parts = item.split(",")
                if len(parts) == 4:
                    operation, ip, un, pw = parts
                    if operation == "DELETE":
                        config_now = [c for c in config_now if c["ip"] != ip]
                    elif operation == "ADD":
                        if ip not in [c["ip"] for c in config_now]:
                            config_now.append({
                                "ip": ip.strip(),
                                "username": un.strip(),
                                "password": pw.strip(),
                            })
                    elif operation == "UPDATE":
                        # Update existing entry
                        for idx, chassis_config in enumerate(config_now):
                            if ip == chassis_config["ip"]:
                                config_now[idx] = {
                                    "ip": ip.strip(),
                                    "username": un.strip(),
                                    "password": pw.strip(),
                                }
                                break
    else:
        for item in config:
            if item:
                parts = item.split(",")
                if len(parts) == 4:
                    operation, ip, un, pw = parts
                    config_now.append({
                        "ip": ip.strip(),
                        "username": un.strip(),
                        "password": pw.strip(),
                    })
    return config_now


async def get_perf_metrics_from_db(ip: str) -> List[Dict]:
    """Fetch Ixia Chassis Performance Metrics"""
    async with _db_read_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            cursor = await conn.execute(f"SELECT * FROM chassis_utilization_details where chassisIp=?", (ip,))
            posts = await cursor.fetchall()
            
            records = [dict(post) for post in posts]
            return records
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
    
    
async def write_polling_intervals_into_database(chassis: int, cards: int, ports: int, sensors: int, licensing: int, perf: int, data_purge: int):
    """Write the polling intervals for different data categories"""
    async with _db_write_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            await conn.execute("DELETE from poll_setting")
            await conn.execute(f"""INSERT INTO poll_setting (chassis, cards, ports, sensors, perf, licensing, data_purge) VALUES 
                (?, ?, ?, ?, ?, ?, ?)""", (chassis, cards, ports, sensors, perf, licensing, data_purge))
            await conn.commit()
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
    
    
async def read_poll_setting_from_database() -> Optional[Dict]:
    """Read the polling intervals for different data categories"""
    async with _db_read_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            cursor = await conn.execute("SELECT * FROM poll_setting")
            post = await cursor.fetchone()
            if post:
                return dict(post)
            return None
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def delete_half_data_from_performance_metric_table():
    """This function will delete half the records from performance metrics data"""
    async with _db_write_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            query = """DELETE FROM chassis_utilization_details 
                WHERE rowid IN 
                (SELECT rowid FROM chassis_utilization_details ORDER BY lastUpdatedAt_UTC DESC
                LIMIT (SELECT COUNT(*)/2 FROM chassis_utilization_details))"""
            await conn.execute(query)
            await conn.commit()
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


async def reset_database():
    """Delete all records from all inventory and configuration tables"""
    async with _db_write_semaphore:
        conn = None
        try:
            conn = await get_db_connection()
            tables = [
                "chassis_summary_details",
                "chassis_card_details",
                "chassis_port_details",
                "chassis_sensor_details",
                "license_details_records",
                "chassis_utilization_details",
                "user_db",
                "user_ip_tags",
                "user_card_tags"
            ]
            for table in tables:
                # Check if table exists before deleting
                try:
                    await conn.execute(f"DELETE FROM {table}")
                except Exception:
                    pass
            
            await conn.commit()
            return True
        except Exception as e:
            if conn:
                try:
                    await conn.rollback()
                except Exception:
                    pass
            raise e
        finally:
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass


def is_input_in_correct_format(ip_pw_list: str) -> bool:
    """Validate input format"""
    for line in ip_pw_list.split("\n"):
        if line.strip():  # Skip empty lines
            if len(line.split(",")) != 4:
                return False
    return True

