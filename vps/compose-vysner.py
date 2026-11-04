"""Turns the rendered Supabase compose config into the VYSNER stack that runs next to eGrid.

Reads $VYSNER_DIR/rendered.json (docker compose config --format json), writes $VYSNER_DIR/docker-compose.yml.
Everything gets its own name (project, containers, network, volumes); only the API gateway gets a port,
on 127.0.0.1; services VYSNER does not need are left out; every service gets a memory limit.
"""

import json
import os
import sys

DIR = os.environ["VYSNER_DIR"]
EG_DIR = os.path.realpath(os.environ["EG_DIR"])
EG_PROJECT = os.environ["EG_PROJECT"]
PORT = os.environ["PORT"]
MEM_DB = os.environ.get("MEM_DB", "1g")
MEM_OTHER = os.environ.get("MEM_OTHER", "512m")
PROJECT = "vysner"

# not needed by VYSNER: realtime, edge functions, logging, image resizing, connection pooler, test mail
DROP = {"realtime", "functions", "analytics", "vector", "imgproxy", "supavisor", "pooler", "mail", "inbucket"}

cfg = json.load(open(os.path.join(DIR, "rendered.json")))
cfg["name"] = PROJECT
services = cfg["services"]


def fail(msg):
    sys.exit(f"Abbruch: {msg}")


for name in [n for n in services if n in DROP]:
    del services[name]

gateway = None
for name, svc in services.items():
    if any(str(p.get("target")) == "8000" for p in svc.get("ports", [])):
        gateway = name
if not gateway:
    fail("API-Gateway (Port 8000) nicht gefunden")

for name, svc in services.items():
    svc["container_name"] = f"{PROJECT}-{name}"
    dep = svc.get("depends_on")
    if isinstance(dep, dict):
        svc["depends_on"] = {k: v for k, v in dep.items() if k in services}
    elif isinstance(dep, list):
        svc["depends_on"] = [k for k in dep if k in services]
    if not svc.get("depends_on"):
        svc.pop("depends_on", None)
    # only the gateway is reachable, and only locally
    if name == gateway:
        svc["ports"] = [{"mode": "ingress", "host_ip": "127.0.0.1", "target": 8000, "published": PORT, "protocol": "tcp"}]
    else:
        svc.pop("ports", None)
    svc["mem_limit"] = MEM_DB if name == "db" else MEM_OTHER
    env = svc.get("environment") or {}
    if name == "storage" and isinstance(env, dict):
        env["ENABLE_IMAGE_TRANSFORMATION"] = "false"
        env.pop("IMGPROXY_URL", None)
    # data and config only from the VYSNER folder – never from eGrid
    for vol in svc.get("volumes", []):
        if vol.get("type") == "bind":
            src = os.path.realpath(vol["source"])
            if src.startswith(EG_DIR + os.sep) or src == EG_DIR:
                fail(f"{name} würde auf den eGrid-Ordner zugreifen: {src}")
            if not (src.startswith(os.path.realpath(DIR) + os.sep) or src in ("/var/run/docker.sock",)):
                fail(f"{name} bindet einen Ordner außerhalb von {DIR}: {src}")
            if src == "/var/run/docker.sock":
                fail(f"{name} braucht den Docker-Socket – nicht erlaubt")

# own network and volumes
for kind in ("networks", "volumes"):
    for key, val in (cfg.get(kind) or {}).items():
        if val is None:
            val = cfg[kind][key] = {}
        nm = val.get("name", "")
        if not nm or nm.startswith(EG_PROJECT + "_") or not nm.startswith(PROJECT + "_"):
            val["name"] = f"{PROJECT}_{key}"
        if val.get("external"):
            fail(f"externes {kind[:-1]} {key} – nicht erlaubt")

used = {v.get("source") for s in services.values() for v in (s.get("volumes") or []) if v.get("type") == "volume"}
if cfg.get("volumes"):
    cfg["volumes"] = {k: v for k, v in cfg["volumes"].items() if k in used}

with open(os.path.join(DIR, "docker-compose.yml"), "w") as f:
    f.write("# VYSNER-Supabase – erzeugt von vps/10-installieren.sh. Läuft getrennt von eGrid.\n")
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("  Dienste:", ", ".join(sorted(services)), "· Gateway:", gateway)
