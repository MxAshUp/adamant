const sinon = require('sinon'),
  chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  // Modules to test
  LoopService = rewire('../include/loop-service');

chai.use(chaiAsPromised);

console_log_spy = sinon.spy();
LoopService.__set__('console', { log: console_log_spy });

describe('Loop Service', () => {
  const sync_fn_spy = new sinon.spy();
  const async_fn_spy = new sinon.spy();

  const async_fn_spy_wrapper = function() {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        async_fn_spy();
        resolve();
      });
    });
  };

  const async_fn_spy_wrapper_100 = function() {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          async_fn_spy();
          resolve();
        },
        100
      );
    });
  };

  const loopy_mc_loopface = new LoopService(async_fn_spy_wrapper);

  beforeEach(() => {
    sync_fn_spy.reset();
    async_fn_spy.reset();
    loopy_mc_loopface.retry_errors = [];
    loopy_mc_loopface.retry_max_attempts = 0;
    loopy_mc_loopface.stop_on_run = 0;
    loopy_mc_loopface.run_count = 0;
    loopy_mc_loopface.run_flag = false;
    loopy_mc_loopface.run_callback = async_fn_spy_wrapper;
    loopy_mc_loopface.run_min_time_between = 0;
  });

  it('Should create instance with run and stop callback', () => {
    expect(loopy_mc_loopface.run_count).to.equal(0);
    expect(loopy_mc_loopface.run_callback).to.deep.equal(async_fn_spy_wrapper);
  });

  it('Should not run if run_count >= stop_on_run', () => {
    loopy_mc_loopface.run_count = 5;
    loopy_mc_loopface.stop_on_run = 3;
    expect(loopy_mc_loopface._should_run).to.equal(false);
  });

  it('Should run if run count < stop_on_run and run_flag is true', () => {
    loopy_mc_loopface.stop_on_run = 3;
    loopy_mc_loopface.run_count = 2;
    loopy_mc_loopface.run_flag = true;
    expect(loopy_mc_loopface._should_run).to.equal(true);
  });

  it('Should not run if run_flag is flase', () => {
    loopy_mc_loopface.run_flag = false;
    expect(loopy_mc_loopface._should_run).to.equal(false);
  });

  it('Should run function once', () => {
    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(async_fn_spy, 1);
    });
  });

  it('Should interrupt after 310ms (3 times)', () => {
    loopy_mc_loopface.run_callback = async_fn_spy_wrapper_100;

    setTimeout(loopy_mc_loopface.stop.bind(loopy_mc_loopface), 310); // Just enough time for 3 runs

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(async_fn_spy, 3);
    });
  });

  it('Should by async even if run fn is not', done => {
    loopy_mc_loopface.run_callback = sync_fn_spy;
    loopy_mc_loopface
      .start()
      .then(() => {
        sinon.assert.callCount(sync_fn_spy, 1);
      })
      .then(done)
      .catch(done);

    setImmediate(loopy_mc_loopface.stop.bind(loopy_mc_loopface));
  });

  it('Should emit started event', () => {
    const event_spy = new sinon.spy();
    loopy_mc_loopface.on('started', event_spy);

    return loopy_mc_loopface
      .start(true)
      .then(() => {
        sinon.assert.callCount(event_spy, 1);
      });
  });

  it('Should interrupt in the middle of a long time_between_runs', () => {
    loopy_mc_loopface.run_callback = sync_fn_spy;
    loopy_mc_loopface.run_min_time_between = 10000; // Wait 10 seconds before 2nd run;

    setTimeout(loopy_mc_loopface.stop.bind(loopy_mc_loopface), 50);
    let start_time = new Date();
    return loopy_mc_loopface
      .start()
      .then(() => {
        sinon.assert.callCount(sync_fn_spy, 1);
        expect((new Date()) - start_time).to.be.below(100);
      });
  });

  it('Should emit started event', () => {
    const event_spy = new sinon.spy();
    loopy_mc_loopface.on('started', event_spy);
    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should emit stopped event', () => {
    const event_spy = new sinon.spy();
    loopy_mc_loopface.on('stopped', event_spy);
    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should by async even if run fn is not', (done) => {
    loopy_mc_loopface.run_callback = sync_fn_spy;

    loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(sync_fn_spy, 1);
    }).then(done).catch(done);

    setImmediate(loopy_mc_loopface.stop.bind(loopy_mc_loopface));

  });

  it('Should emit error event', () => {
    const event_spy = new sinon.spy();
    const spy_thrower = sinon.stub().throws();
    loopy_mc_loopface.run_callback = spy_thrower;

    loopy_mc_loopface.on('error', event_spy);

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should retry 3 times', () => {
    loopy_mc_loopface.run_callback = sinon.stub().throws();
    loopy_mc_loopface.retry_max_attempts = 3;

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(loopy_mc_loopface.run_callback, 4);
    });
  });

  it('Should emit new retry event on each retry attempt', () => {
    const error_event_spy = sinon.spy();
    const retry_event_spy = sinon.spy();
    loopy_mc_loopface.on('error', error_event_spy);
    loopy_mc_loopface.on('retry', retry_event_spy);
    loopy_mc_loopface.run_callback = sinon.stub().throws();
    loopy_mc_loopface.retry_max_attempts = 3;

    return loopy_mc_loopface.start().then(() => {
      // console.log(err);
      // sinon.assert.callCount(error_event_spy, 4);
      sinon.assert.callCount(retry_event_spy, 3);
      sinon.assert.callCount(loopy_mc_loopface.run_callback, 4);
    });
  });

  it('Should retry on any error if retry_errors array is empty', () => {
    const random_error_name = Math.random().toString(36).substring(7);
    loopy_mc_loopface.run_callback = sinon.stub().throws(random_error_name);
    loopy_mc_loopface.retry_max_attempts = 2;
    loopy_mc_loopface.retry_errors = [];

    return loopy_mc_loopface
      .start()
      .then(() => {
        // this shouldn't happen
      })
      .catch(err => {
        sinon.assert.callCount(loopy_mc_loopface.run_callback, 2);
      });
  });

  it('Should not retry on any error if retry_errors array has items', () => {
    const random_error_name = Math.random().toString(36).substring(7);
    loopy_mc_loopface.run_callback = sinon.stub().throws(random_error_name);
    loopy_mc_loopface.retry_max_attempts = 2;
    loopy_mc_loopface.retry_errors = ['foo', 'bar'];

    return loopy_mc_loopface
      .start()
      .then(() => {
        // this shouldn't happen
      })
      .catch(err => {
        sinon.assert.callCount(loopy_mc_loopface.run_callback, 1);
      });
  });

  it('Should reset retry_attempts after retries are exhausted', () => {
    loopy_mc_loopface.run_callback = sinon.stub().throws();
    loopy_mc_loopface.retry_max_attempts = 3;

    return loopy_mc_loopface
      .start()
      .then(() => {
        // this shouldn't happen
      })
      .catch(err => {
        sinon.assert.callCount(loopy_mc_loopface.run_callback, 3);
        expect(loopy_mc_loopface.retry_attempts).to.equal(0);
      });
  });

  it('Should never call console.log', () => {
    sinon.assert.neverCalledWith(console_log_spy);
  });
});
