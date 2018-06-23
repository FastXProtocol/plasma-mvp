import os
import shutil
from time import time as ttime

from plasma.config import plasma_config


def list_snapshots():
    res = []
    for dir_name in os.listdir(plasma_config["PICKLE_DIR"]):
        dir_path = os.path.join(plasma_config["PICKLE_DIR"], dir_name)
        if os.path.isdir(dir_path):
            res.append(dir_name)
    return res


def get_max_snapshot():
    snapshots = list_snapshots()
    if snapshots:
        return max(list_snapshots())
    return None


def make_snapshot():
    timestamp = ttime()
    max_snapshot = get_max_snapshot()
    if max_snapshot and timestamp - int(max_snapshot) < plasma_config["MIN_SNAPSHOT_SECONDS"]:
#         print("snapshot skip")
        return
    snapshot_dir = os.path.join(plasma_config["PICKLE_DIR"], str(int(timestamp)))
    if not os.path.exists(snapshot_dir):
        os.mkdir(snapshot_dir)
    else:
#         print("snapshot skip")
        return
    for file_name in os.listdir(plasma_config["PICKLE_DIR"]):
        file_path = os.path.join(plasma_config["PICKLE_DIR"], file_name)
        if os.path.isfile(file_path) and file_name.endswith(".pickle"):
            shutil.copy(file_path, os.path.join(snapshot_dir, file_name))
    print("snapshot created")