"""This script will poll all the chassis data every 5 minutes and write it into the database.

Tables:

chassis_summary_details
chassis_card_details
chassis_port_details
license_details_records

chassis_cpu_utilization
chassis_memory_utilization
"""

import sqlite3
from sqlite3 import Error
import os
import db_queries


def create_connection(db_file):
    """ create a database connection to the SQLite database
        specified by db_file
    :param db_file: database file
    :return: Connection object or None
    """
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        # Enable WAL mode for better concurrency and performance
        # This allows multiple readers and one writer simultaneously
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.commit()
        print(f"[INIT] Database created with WAL mode: {db_file}")
        return conn
    except Error as e:
        print(f"[INIT] Error creating database connection: {e}")

    return conn


def delete_table(conn):
    
    cmds = ["DROP TABLE IF EXISTS chassis_summary_details",
            "DROP TABLE IF EXISTS chassis_card_details",
            "DROP TABLE IF EXISTS chassis_port_details",
            "DROP TABLE IF EXISTS chassis_sensor_details",
            "DROP TABLE IF EXISTS license_details_records",
            "DROP TABLE IF EXISTS user_db",
            "DROP TABLE IF EXISTS poll_setting",
            "DROP TABLE IF EXISTS chassis_utilization_details",
            "DROP TABLE IF EXISTS ixnetwork_user_db",
            "DROP TABLE IF EXISTS ixnetwork_api_server_details"]
    try:
        c = conn.cursor()
        for cmd in cmds:
            c.execute(cmd)
        conn.commit()
    except Error as e:
        print(e)

def create_table(conn, create_table_sql):
    """ create a table from the create_table_sql statement
    :param conn: Connection object
    :param create_table_sql: a CREATE TABLE statement
    :return:
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)


def create_data_tables():
    # Use DATABASE_PATH environment variable if set, otherwise default to inventory.db
    database = os.getenv("DATABASE_PATH", "inventory.db")
    print(f"[INIT] Creating database at: {database}")
    # create a database connection
    conn = create_connection(database)

    # create tables
    if conn is not None:
        
        # delete_table(conn)
        create_table(conn, db_queries.create_usenname_password_table)
        
        create_table(conn, db_queries.create_chassis_summary_sql)
        create_table(conn, db_queries.create_card_details_records_sql)
        create_table(conn, db_queries.create_port_details_records_sql)
        create_table(conn, db_queries.create_license_details_records_sql)
        create_table(conn, db_queries.create_sensor_details_sql)
        
        
        create_table(conn, db_queries.create_ip_tags_sql)
        create_table(conn, db_queries.create_card_tags_sql)
        create_table(conn, db_queries.create_usage_metrics)
        create_table(conn, db_queries.create_poll_settings_table)
        
        # IxNetwork API Server tables
        create_table(conn, db_queries.create_ixnetwork_user_db_table)
        create_table(conn, db_queries.create_ixnetwork_api_server_details_table)
        
        # Close the connection
        conn.close()
        print(f"[INIT] Database tables created successfully")
    else:
        print("[INIT] Error: Could not create database connection")

create_data_tables()
