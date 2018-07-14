from time import sleep, time as ttime
from threading import Thread
import traceback


class FinalizeExitsAutoSubmitter(Thread):
    def __init__(self, authority, root_chain, interval, **kwargs):
        super(FinalizeExitsAutoSubmitter, self).__init__(**kwargs)
        self.authority = authority
        self.root_chain = root_chain
        self.interval = float(interval)

    def work(self):
        try:
            utxo_pos, exitable_at = self.root_chain.call().getNextExit()
        except Exception as e:
            return
        if ttime() > exitable_at:
            self.root_chain.transact({'from': '0x' + self.authority.hex(), "gas": 300000}).finalizeExits()
            print("finalize exit, triggered by %s %s" % (utxo_pos, exitable_at))

    def run(self):
        while True:
            try:
                self.work()
            except Exception as e:
                print("auto submit finalize exits failed")
                traceback.print_exc()
            sleep(self.interval)