from time import sleep
from threading import Thread
import traceback


class BlockAutoSubmitter(Thread):
    def __init__(self, child_chain, interval, **kwargs):
        super(BlockAutoSubmitter, self).__init__(**kwargs)
        self.child_chain = child_chain
        self.interval = float(interval)

    def run(self):
        while True:
            try:
                self.child_chain.submit_curblock()
            except Exception as e:
                print("auto submit block failed")
                traceback.print_exc()
            sleep(self.interval)