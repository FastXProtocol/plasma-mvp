import threading
import traceback


class BlockAutoSubmitter(object):
    def __init__(self, child_chain, interval, **kwargs):
        super(BlockAutoSubmitter, self).__init__(**kwargs)
        self.child_chain = child_chain
        self.interval = float(interval)

    def start_timer(self):
        self.run_timer()
    
    def run_timer(self):
        threading.Timer(self.interval, self.timer).start()
    
    def timer(self):
        try:
            self.child_chain.submit_curblock()
        except Exception as e:
            print("auto submit block failed")
            traceback.print_exc()
        self.run_timer()