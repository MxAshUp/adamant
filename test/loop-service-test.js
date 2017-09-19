const sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  // Modules to test
  LoopService = rewire('../libs/components/loop-service');

describe('Loop Service', () => {
  function async_fn_spy_wrapper(timeout) {
    return sinon.stub().callsFake(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, timeout);
      });
    });
  }

  it('Should create instance with run and stop callback', () => {
    let cb = () => Math.random();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    expect(loopy_mc_loopface.run_callback).to.deep.equal(cb);
  });

  it('Should not run if run_count > stop_on_run', () => {
    let cb = () => Math.random();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    loopy_mc_loopface.run_count = 5;
    loopy_mc_loopface.stop_on_run = 3;
    expect(loopy_mc_loopface._should_stop).to.equal(true);
    loopy_mc_loopface.run_count = 3;
    loopy_mc_loopface.stop_on_run = 3;
    expect(loopy_mc_loopface._should_stop).to.equal(true);
    loopy_mc_loopface.run_count = 2;
    loopy_mc_loopface.stop_on_run = 3;
    expect(loopy_mc_loopface._should_stop).to.equal(false);
  });

  it('Should run function once', () => {
    let cb = async_fn_spy_wrapper();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(cb, 1);
    });
  });

  it('Should run function with proper this context', () => {
    let cb = async_fn_spy_wrapper();
    let loopy_mc_loopface = new LoopService({run_callback: cb.bind(cb)});
    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.calledOn(cb, cb);
      sinon.assert.callCount(cb, 1);
    });
  });

  it('Should interrupt after 290ms (3 times)', () => {
    let cb = async_fn_spy_wrapper(100);
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    setTimeout(loopy_mc_loopface.stop.bind(loopy_mc_loopface), 300); // Just enough time for 3 runs

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(cb, 3);
    });
  });

  it('Should by async even if run fn is not', done => {
    let cb = sinon.spy();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    loopy_mc_loopface
      .start()
      .then(() => {
        sinon.assert.callCount(cb, 1);
      })
      .then(done)
      .catch(done);

    setImmediate(loopy_mc_loopface.stop.bind(loopy_mc_loopface));
  });

  it('Should emit start event', () => {
    let loopy_mc_loopface = new LoopService(async_fn_spy_wrapper());
    const event_spy = sinon.spy();
    loopy_mc_loopface.on('start', event_spy);

    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should emit stop event', () => {
    let loopy_mc_loopface = new LoopService(async_fn_spy_wrapper());
    const event_spy = sinon.spy();
    loopy_mc_loopface.on('stop', event_spy);

    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should emit complete event', () => {
    let loopy_mc_loopface = new LoopService(async_fn_spy_wrapper());
    const event_spy = sinon.spy();
    loopy_mc_loopface.on('complete', event_spy);

    return loopy_mc_loopface.start(true).then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should interrupt in the middle of a long time_between_runs', () => {
    let cb = sinon.spy();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    loopy_mc_loopface.run_min_time_between = 10000; // Wait 10 seconds before 2nd run;

    setTimeout(loopy_mc_loopface.stop.bind(loopy_mc_loopface), 50);
    let start_time = new Date();
    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(cb, 1);
      expect(new Date() - start_time).to.be.below(100);
    });
  });

  it('Should reject if already running', () => {
    let cb = sinon.spy();
    let loopy_mc_loopface = new LoopService({run_callback: cb});
    loopy_mc_loopface.run_min_time_between = 10000; // Wait 10 seconds before 2nd run;

    // Initial start
    loopy_mc_loopface.start();

    // Bad second start should throw error
    return loopy_mc_loopface
      .start()
      .then(() => {
        throw Error('Start() should have thrown error');
      })
      .catch(err => {
        expect(err).to.equal('Loop service is already running.');
      })
      .then(loopy_mc_loopface.stop.bind(loopy_mc_loopface));
  });

  it('Should emit error event', () => {
    const event_spy = sinon.spy();
    const spy_thrower = sinon.stub().throws();
    let loopy_mc_loopface = new LoopService({run_callback: spy_thrower});

    loopy_mc_loopface.on('error', event_spy);

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(event_spy, 1);
    });
  });

  it('Should retry 3 times', () => {
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(),
      retry_max_attempts: 3
    });
    loopy_mc_loopface.on('error', sinon.stub());

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(loopy_mc_loopface.run_callback, 4);
    });
  });

  it('Should emit new retry event on each retry attempt', () => {
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(),
      retry_max_attempts: 3
    });
    const error_event_spy = sinon.spy();
    const retry_event_spy = sinon.spy();
    loopy_mc_loopface.on('error', error_event_spy);
    loopy_mc_loopface.on('retry', retry_event_spy);

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(error_event_spy, loopy_mc_loopface.retry_max_attempts + 2);

      let last_arg_passed = error_event_spy.getCall(loopy_mc_loopface.retry_max_attempts + 1).args[0];
      expect(last_arg_passed).to.be.instanceof(Error);
      expect(last_arg_passed.message).to.equal(`Max retry attempts (${ loopy_mc_loopface.retry_max_attempts}) reached.`);

      sinon.assert.callCount(retry_event_spy, loopy_mc_loopface.retry_max_attempts);
      sinon.assert.callCount(loopy_mc_loopface.run_callback, loopy_mc_loopface.retry_max_attempts + 1);
    });
  });

  it('Should retry on any error if retry_errors array is empty', () => {
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(),
      retry_max_attempts: 2,
      retry_errors: [],
    });
    loopy_mc_loopface.on('error', sinon.spy());

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(
        loopy_mc_loopface.run_callback,
        loopy_mc_loopface.retry_max_attempts + 1
      );
    });
  });

  it('Should not retry because Error is not in errors_only_retry_on array', () => {
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(),
      retry_max_attempts: 2,
      errors_only_retry_on: ['foo', 'bar'],
    });
    loopy_mc_loopface.on('error', sinon.spy());

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(loopy_mc_loopface.run_callback, 1);
    });
  });

  it('Should not retry because Error is in errors_dont_retry_on array', () => {
    class CustomError extends Error {}
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(new CustomError()),
      errors_dont_retry_on: ['foo', 'CustomError'],
      retry_max_attempts: 2,
    });
    loopy_mc_loopface.on('error', sinon.spy());

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(loopy_mc_loopface.run_callback, 1);
    });
  });

  it('Should reset retry_attempts after retries are exhausted', () => {
    let loopy_mc_loopface = new LoopService({
      run_callback: sinon.stub().throws(),
      retry_max_attempts: 3,
    });
    loopy_mc_loopface.on('error', sinon.spy());

    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(
        loopy_mc_loopface.run_callback,
        loopy_mc_loopface.retry_max_attempts + 1
      );
      expect(loopy_mc_loopface.retry_attempts).to.equal(0);
    });
  });

  it('Should reset retry_attempts after success', () => {
    let throwthowpass_stub = sinon.stub().resolves();
    throwthowpass_stub.onFirstCall().throws();
    throwthowpass_stub.onSecondCall().throws();
    let loopy_mc_loopface = new LoopService({
      run_callback: throwthowpass_stub,
      retry_max_attempts: 3,
    });
    let error_spy = sinon.spy();
    loopy_mc_loopface.on('error', error_spy);
    loopy_mc_loopface.stop_on_run = 3;
    return loopy_mc_loopface.start().then(() => {
      sinon.assert.callCount(error_spy, 2);
      expect(loopy_mc_loopface.retry_attempts).to.equal(0);
    });
  });
});
