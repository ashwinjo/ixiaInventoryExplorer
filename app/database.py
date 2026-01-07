"""
Async database utilities for SQLite
"""
import aiosqlite
import json
import os
from typing import List, Dict, Optional, Any

DATABASE_PATH = os.getenv("DATABASE_PATH", "inventory.db")


async def get_db_connection():
    """Get async connection to sqlite3 database"""
    conn = await aiosqlite.connect(DATABASE_PATH)
    conn.row_factory = aiosqlite.Row
    return conn


async def write_data_to_database(table_name: str, records: List[Dict], ip_tags_dict: Optional[Dict] = None):
    """Write polled data inside sqlite3 DB"""
    tags = ""
    conn = await get_db_connection()
    
    # Clear old records from database
    if table_name != "chassis_utilization_details":
        await conn.execute(f"DELETE FROM {table_name}")
    
    for record in records:
        if table_name == "chassis_summary_details":
            if ip_tags_dict:
                tags = ip_tags_dict.get(record["chassisIp"])
                if tags:
                    tags = ",".join(tags)
                else:
                    tags = ""
            else:
                tags = ""
                
            record.update({"tags": tags})
            
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
                    tags = ip_tags_dict.get(record["chassisIp"])
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
            await conn.execute(f"""INSERT INTO {table_name} (chassisIp,mem_utilization,cpu_utilization,lastUpdatedAt_UTC) VALUES 
                            (?, ?, ?, ?)""",
                            (record["chassisIp"], record["mem_utilization"], record["cpu_utilization"], record["lastUpdatedAt_UTC"]))
            
    await conn.commit()
    await conn.close()


async def read_data_from_database(table_name: str) -> List[Dict]:
    """Read polled data from sqlite3 DB"""
    conn = await get_db_connection()
    cursor = await conn.execute(f"SELECT * FROM {table_name}")
    rows = await cursor.fetchall()
    await conn.close()
    
    # Convert Row objects to dictionaries
    records = [dict(row) for row in rows]
    return records


async def write_tags(ip: str, tags: str, type_of_update: str, operation: str) -> str:
    """Write tags to sqlite3 DB"""
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
    await conn.close()
    return "Records successfully updated"
        

async def read_tags(type_of_update: str) -> Dict[str, List[str]]:
    """Read tags from sqlite3 DB"""
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
    await conn.close()
    
    for post in posts:
        tags_str = post["tags"] if post["tags"] else ""
        ip_tags_dict.update({post[field]: tags_str.split(",") if tags_str else []})
    return ip_tags_dict


async def get_chassis_type_from_ip(chassisIp: str) -> str:
    """Get type of Ixia Chassis from IP"""
    conn = await get_db_connection()
    cursor = await conn.execute(f"SELECT type_of_chassis FROM chassis_summary_details where ip = ?", (chassisIp,))
    post = await cursor.fetchone()
    await conn.close()
    if post:
        return post['type_of_chassis']
    return "NA"
    

async def write_username_password_to_database(list_of_un_pw: str):
    """Write user information about ixia servers into database"""
    conn = await get_db_connection()
    await conn.execute("DELETE from user_db")
    user_pw_dict = await create_config_dict(list_of_un_pw)
    user_pw_dict = list({v['ip']:v for v in user_pw_dict}.values())
    json_str_data = json.dumps(user_pw_dict)
    await conn.execute(f"INSERT INTO user_db (ixia_servers_json) VALUES (?)", (json_str_data,))
    await conn.commit()
    await conn.close()
   
    
async def read_username_password_from_database() -> str:
    """Read user information about ixia servers from database"""
    conn = await get_db_connection()
    cursor = await conn.execute("SELECT * FROM user_db")
    post = await cursor.fetchone()
    await conn.close()
    if post:
        return post['ixia_servers_json']
    return "[]"


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
    conn = await get_db_connection()
    cursor = await conn.execute(f"SELECT * FROM chassis_utilization_details where chassisIp=?", (ip,))
    posts = await cursor.fetchall()
    await conn.close()
    
    records = [dict(post) for post in posts]
    return records
    
    
async def write_polling_intervals_into_database(chassis: int, cards: int, ports: int, sensors: int, licensing: int, perf: int, data_purge: int):
    """Write the polling intervals for different data categories"""
    conn = await get_db_connection()
    await conn.execute("DELETE from poll_setting")
    await conn.execute(f"""INSERT INTO poll_setting (chassis, cards, ports, sensors, perf, licensing, data_purge) VALUES 
                (?, ?, ?, ?, ?, ?, ?)""", (chassis, cards, ports, sensors, perf, licensing, data_purge))
    await conn.commit()
    await conn.close()
    
    
async def read_poll_setting_from_database() -> Optional[Dict]:
    """Read the polling intervals for different data categories"""
    conn = await get_db_connection()
    cursor = await conn.execute("SELECT * FROM poll_setting")
    post = await cursor.fetchone()
    await conn.close()
    if post:
        return dict(post)
    return None


async def delete_half_data_from_performance_metric_table():
    """This function will delete half the records from performance metrics data"""
    conn = await get_db_connection()
    query = """DELETE FROM chassis_utilization_details 
                WHERE rowid IN 
                (SELECT rowid FROM chassis_utilization_details ORDER BY lastUpdatedAt_UTC DESC
                LIMIT (SELECT COUNT(*)/2 FROM chassis_utilization_details))"""
    await conn.execute(query)
    await conn.commit()
    await conn.close()


def is_input_in_correct_format(ip_pw_list: str) -> bool:
    """Validate input format"""
    for line in ip_pw_list.split("\n"):
        if line.strip():  # Skip empty lines
            if len(line.split(",")) != 4:
                return False
    return True

