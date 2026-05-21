# Add chassisRole Field Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Propagate `chassisRole` from `/chassis/api/v2/ixos/chassis` API response through DB, backend, and UI.

**Architecture:** Extract from existing `chassis_data` dict in `get_chassis_information()`, store as TEXT in SQLite, expose via FastAPI `/api/chassis`, render as new column after "Type" in ChassisPage.

**Tech Stack:** Python/FastAPI, SQLite (aiosqlite), Pydantic v2, React/JSX

---

### Task 1: DB schema — new column + migration

**Files:**
- Modify: `db_queries.py`
- Modify: `init_db.py`

**Step 1:** Add `chassisRole TEXT` to CREATE TABLE in `db_queries.py`.

In `create_chassis_summary_sql`, add after `os TEXT`:
```python
                                os TEXT,
                                chassisRole TEXT
```

**Step 2:** Add ALTER TABLE migration in `init_db.py` `create_data_tables()` after the `create_table(conn, db_queries.create_chassis_summary_sql)` call:
```python
        # Migrate existing DB: add chassisRole if missing
        try:
            conn.execute("ALTER TABLE chassis_summary_details ADD COLUMN chassisRole TEXT")
            conn.commit()
            print("[INIT] Added chassisRole column to chassis_summary_details")
        except Exception:
            pass  # Column already exists
```

**Step 3:** Commit
```bash
git add db_queries.py init_db.py
git commit -m "feat: add chassisRole column to chassis_summary_details schema"
```

---

### Task 2: Extract chassisRole from API response

**Files:**
- Modify: `IxOSRestAPICaller.py:80-91`

**Step 1:** In `get_chassis_information()`, add `chassisRole` extraction to `chassis_filter_dict.update(...)`:
```python
    chassis_filter_dict.update({ "chassisIp": chassis_data.get("managementIp"),
                                 "chassisSerial#": chassis_data.get("serialNumber", no_serial_string),
                                 "controllerSerial#": chassis_data.get("controllerSerialNumber", "NA"),
                                 "chassisType": chassis_data["type"].replace(" ", "_"),
                                 "physicalCards#": str(chassis_data.get("numberOfPhysicalCards", "NA")),
                                 "chassisStatus": chassis_data.get('state'),
                                 "lastUpdatedAt_UTC": last_update_at,
                                 "mem_bytes": mem_bytes,
                                 "mem_bytes_total": mem_bytes_total,
                                 "cpu_pert_usage": cpu_pert_usage,
                                 "os": os,
                                 "chassisRole": chassis_data.get("chassisRole", "NA")
                                })
```

**Step 2:** Add `"chassisRole": "NA"` to failure response in `data_poller.py:fetch_chassis_summary_for_one()`.

**Step 3:** Commit
```bash
git add IxOSRestAPICaller.py data_poller.py
git commit -m "feat: extract chassisRole from chassis API response"
```

---

### Task 3: Persist chassisRole in database

**Files:**
- Modify: `app/database.py:131-140`

**Step 1:** Update INSERT in `write_data_to_database()` for `chassis_summary_details`:
```python
                    await conn.execute(f"""INSERT INTO {table_name} (ip, chassisSN, controllerSN, type_of_chassis,
                        physicalCards, status_status, ixOS, ixNetwork_Protocols, ixOS_REST, tags, lastUpdatedAt_UTC,
                        mem_bytes, mem_bytes_total, cpu_pert_usage, os, chassisRole) VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)""",
                        (record["chassisIp"], record['chassisSerial#'],
                        record['controllerSerial#'], record['chassisType'], record['physicalCards#'],
                        record['chassisStatus'],
                        record.get('IxOS', "NA"), record.get('IxNetwork Protocols',"NA"), record.get('IxOS REST',"NA"), record['tags'],
                        record.get('mem_bytes', '0'), record.get('mem_bytes_total', '0'), record.get('cpu_pert_usage', '0'),
                        record['os'], record.get('chassisRole', 'NA')))
```

**Step 2:** Commit
```bash
git add app/database.py
git commit -m "feat: persist chassisRole in database write"
```

---

### Task 4: Expose chassisRole via FastAPI

**Files:**
- Modify: `app/models/chassis.py`
- Modify: `app/api/chassis.py`

**Step 1:** Add field to `ChassisResponse` in `app/models/chassis.py`:
```python
    chassisRole: str = Field(..., description="Role of the chassis (e.g., Master, Slave)")
```

**Step 2:** Map field in `app/api/chassis.py` `chassis_data` dict:
```python
                "chassisRole": record.get("chassisRole", "NA"),
```
Add it after the `"os"` line.

**Step 3:** Commit
```bash
git add app/models/chassis.py app/api/chassis.py
git commit -m "feat: expose chassisRole in chassis API response"
```

---

### Task 5: Render chassisRole in UI

**Files:**
- Modify: `src/pages/ChassisPage.jsx`

**Step 1:** Add `<TableHead>Chassis Role</TableHead>` after the "Type" `<TableHead>` (line ~459).

**Step 2:** Add `<TableCell>` in table body after the "Type" cell:
```jsx
<TableCell>{chassis.chassisRole && chassis.chassisRole !== 'NA' ? chassis.chassisRole : 'N/A'}</TableCell>
```

**Step 3:** Update `colSpan` on "No chassis found" row from `12` to `13`.

**Step 4:** Commit
```bash
git add src/pages/ChassisPage.jsx
git commit -m "feat: add Chassis Role column to chassis table UI"
```
