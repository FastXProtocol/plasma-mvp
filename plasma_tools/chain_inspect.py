try:
    import readline
except ImportError:
    print("Module readline not available.")
else:
    import rlcompleter
    readline.parse_and_bind("tab: complete")

import os
import sys
import pickle
import json
from time import localtime, strftime
from code import interact

sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from plasma.config import plasma_config
from plasma.child_chain.snapshot import list_snapshots


list_timestamp = list_snapshots


class ChildChainSnapshot(object):
    def __init__(self, timestamp=None, *args, **kwargs):
        self.timestamp = timestamp
        if self.timestamp == None:
            self.pickle_dir = plasma_config["PICKLE_DIR"]
        elif self.timestamp < 1000000000:
            self.timestamp = list_timestamp()[self.timestamp]
            self.pickle_dir = os.path.join(plasma_config["PICKLE_DIR"], str(self.timestamp))
        else:
            self.pickle_dir = os.path.join(plasma_config["PICKLE_DIR"], str(self.timestamp))
        self.snapshot = {}
        
        self.load()
    
    def load(self):
        if not os.path.exists(self.pickle_dir):
            raise Exception("pickle dir does not exists")
        for file_name in os.listdir(self.pickle_dir):
            file_path = os.path.join(self.pickle_dir, file_name)
            if os.path.isfile(file_path) and file_name.endswith(".pickle"):
                try:
                    with open(file_path, 'rb') as f:
                        self.snapshot[file_name[: -len(".pickle")]] = pickle.load(f)
                except Exception as e:
                    print("load %s failed: %s" % (file_name, str(e)))
    
    def __repr__(self):
        res = "ChildChainSnapshot %s<%s>" % (
            "CURRENT" if self.timestamp is None else strftime("%Y-%m-%d %H:%M:%S", localtime(int(self.timestamp))),
            json.dumps({key: str(value) for key, value in self.snapshot.items()}, indent=4, sort_keys=True),
        )
        return res


if __name__ == "__main__":
    cur_child_chain_snapshot = ChildChainSnapshot()
    vars = {
        "snapshot": cur_child_chain_snapshot,
        "list_timestamp": list_timestamp,
    }
    def load_snapshot(timestamp=None):
        vars["snapshot"] = ChildChainSnapshot(timestamp=timestamp)
        return vars["snapshot"]
    vars["load_snapshot"] = load_snapshot
    message = """\
snapshot: snapshot loaded
load_snapshot(timestamp=None): load snapshot by timestamp or snapshot index
list_timestamp(): list all timestamp available"""
    interact(banner=message, local=vars)