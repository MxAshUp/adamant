const // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  rewire = require('rewire'),
  sinon = require('sinon'),
  _ = require('lodash'),
  // Modules to test
  EventHandleError = require('../libs/errors').EventHandleError,
  EventHandler = rewire('../libs/components/event-handler'),
  EventDispatcher = rewire('../libs/event-dispatcher'),
  Event = rewire('../libs/event'),
  EventComplete = require('../libs/event-complete');

const immmediatePromise = () => {
  return new Promise(resolve => {
    setImmediate(resolve);
  })
};

describe('Event System', () => {

  describe('Event Handler', () => {

    it('Should throw error if support_revert is false and revert() is called', () => {
      const mock_handler_1 = new EventHandler({event_name: 'mock_event'});
      expect(mock_handler_1.revert.bind(mock_handler_1)).to.throw(
        'Handler does not support revert.'
      );
    });

    describe('Default behaviors of overridable methods', () => {

      let instance = new EventHandler({event_name: 'mock_event'});

      it('Should throw error if no event_name provided', () => {
        expect(() => {
          new EventHandler();
        }).to.throw(Error, `Missing required parameter: event_name`);
      });

      it('Should set should_handle by default to null', () => {
        expect(instance.should_handle).to.equal(null);
      });

      it('Should set defer_dispatch by default to null', () => {
        expect(instance.defer_dispatch).to.equal(null);
      });

      it('Should set enqueue_complete_event by default to false', () => {
        expect(instance.enqueue_complete_event).to.equal(false);
      });

      it('Should set transform_function by default to null', () => {
        expect(instance.transform_function).to.equal(null);
      });

      it('Dispatch() should return nothing if nothing passed', () => {
        expect(instance.dispatch()).to.be.undefined;
      });

      it('Dispatch() should return data if data passed', () => {
        const mock_data = Math.random();
        expect(instance.dispatch(mock_data)).to.equal(mock_data);
      });

      it('Revert() should return nothing if support_revert = true', () => {
        instance.supports_revert = true;
        expect(instance.revert()).to.be.undefined;
        expect(instance.revert.bind(instance)).to.not.throw();
      });

    });

    describe('Settable properties', () => {

      it('Should set event_name to mock value', () => {
        mock_event_name = `event_name_${Math.random()}`;
        const instance = new EventHandler({event_name: mock_event_name});
        expect(instance.event_name).to.equal(mock_event_name);
      });

      it('Should set should_handle to mock value', () => {
        mock_should_handle = sinon.stub().returns(true);
        const instance = new EventHandler({event_name: mock_event_name, should_handle: mock_should_handle});
        expect(instance.should_handle).to.equal(mock_should_handle);
      });

      it('Should set defer_dispatch to mock value', () => {
        mock_defer_dispatch = {
          event_name: `event_${Math.random()}`,
          check_function: sinon.stub().resolves(true),
        };
        const instance = new EventHandler({event_name: mock_event_name, defer_dispatch: mock_defer_dispatch});
        expect(instance.defer_dispatch).to.equal(mock_defer_dispatch);
      });

      it('Should set enqueue_complete_event to mock value', () => {
        mock_enqueue_complete_event = true;
        const instance = new EventHandler({event_name: mock_event_name, enqueue_complete_event: mock_enqueue_complete_event});
        expect(instance.enqueue_complete_event).to.equal(mock_enqueue_complete_event);
      });

      it('Should set transform_function to mock value', () => {
        mock_transform_function = sinon.stub().returns();
        const instance = new EventHandler({event_name: mock_event_name, transform_function: mock_transform_function});
        expect(instance.transform_function).to.equal(mock_transform_function);
      });

    });
  });

  describe('Event Dispatcher', () => {

    describe('Managing Handlers', () => {

      let dispatcher;

      const mock_handlers = [];

      beforeEach(() => {
        dispatcher = new EventDispatcher();

        mock_handlers.splice(0, mock_handlers.length);
        mock_handlers.length = 5+Math.floor(Math.random()*5); // Random number of handlers between 5 and 10

        for(let index = 0; index < mock_handlers.length; index++) {
          mock_handlers[index] = new EventHandler({event_name: `test.event_${index}.random.${Math.random()}`});
          mock_handlers[index].dispatch = sinon.stub();
          mock_handlers[index].revert = sinon.stub();
          mock_handlers[index].supports_revert = true;
        }
      });

      // *** Handler management ***

      it('Should add event handler to dispatcher', () => {

        let mock_ids = [];

        // Add all handlers to dispatcher
        mock_handlers.forEach((handler, index) => {
          mock_ids[index] = dispatcher.load_event_handler(handler);
        });

        // Check that handlers are retrieved by id
        mock_handlers.forEach((handler, index) => {
          expect(dispatcher.get_event_handler(mock_ids[index])).to.deep.equal(handler);
        });
      });

      it('Should remove event handler and return handler', () => {
        mock_handler_id = dispatcher.load_event_handler(mock_handlers[0]);
        // Removed event handler, check if proper object returned
        expect(dispatcher.remove_event_handler(mock_handler_id)).to.deep.equal(mock_handlers[0]);
        // Make sure it's no longer in dispatcher
        expect(dispatcher.get_event_handler(mock_handler_id)).to.be.undefined;
      });

      it('Should return false if no event handler found to remove', () => {
        expect(dispatcher.remove_event_handler('NONEXISTING_ID')).to.equal(false);
      });

      it('All event handlers should have unique ID', () => {
        // Add all handlers to dispatcher
        mock_handlers.forEach(handler => {
          dispatcher.load_event_handler(handler);
        });
        expect(dispatcher.event_handlers.length).to.equal(
          _.uniqBy(dispatcher.event_handlers, handler => handler.instance_id)
            .length
        );
      });

    });

    describe('Managing Events', () => {

      let dispatcher;

      const mock_events = [];

      beforeEach(() => {
        dispatcher = new EventDispatcher();

        mock_events.splice(0, mock_events.length);
        mock_events.length = 5+Math.floor(Math.random()*5); // Random number of handlers between 5 and 10

        for(let index = 0; index < mock_events.length; index++) {
          mock_events[index] = new Event(`test.event_${index}.random.${Math.random()}`, Math.random());
        }
      });

      // *** Events ***
      it('Should enqueue all events', () => {
        mock_events.forEach(event => {
          dispatcher.enqueue_event(event);
        });

        expect(dispatcher.event_queue_count).to.equal(mock_events.length);
      });

      it('All events should have have unique ID', () => {
        mock_events.forEach(event => {
          dispatcher.enqueue_event(event);
        });

        expect(dispatcher.event_queue.length).to.equal(
          _.uniqBy(dispatcher.event_queue, event => event.queue_id).length
        );
      });

      it('Should shift first event from queue', () => {
        dispatcher.enqueue_event(mock_events[0]);
        expect(dispatcher.shift_event()).to.deep.equal(mock_events[0]);
        expect(dispatcher.event_queue_count).to.equal(0);
      });
    });

    describe('Dispatching events', () => {

      let dispatcher;

      const mock_handlers = [];
      const mock_handler_ids = [];
      const mock_events = [];

      const event_name_A = `test.event_A.random.${Math.random()}`;
      const event_name_B = `test.event_B.random.${Math.random()}`;

      // Define mock handler lengths
      mock_handlers.length = 7+Math.floor(Math.random()*3); // Random number of handlers between 7 and 10
      mock_handler_ids.length = mock_handlers.length;

      // Define mock event length
      mock_events.splice(0, mock_events.length);
      mock_events.length = 5 + Math.floor(Math.random()*5); // Random number of handlers between 5 and 10

      // First 3 handlers have the same event name
      // 4th and 5th handlers have the same event name
      // Remaining handlers have unique name
      const generate_event_name_for_handler = (index) => {
        if(index <= 2) {
          return event_name_A;
        } else if(index <= 4) {
          return event_name_B;
        } else {
          return `test.event_${index}.random.${Math.random()}`;
        }
      }

      // First event have the same event name as first three handlers
      // 2nd and 3rd event have same event name as 4th and 5th handler
      // Remaining events have unique name that don't correspond to handlers
      const generate_event_name_for_event = (index) => {
        if(index == 0) {
          return event_name_A;
        } else if(index <= 2) {
          return event_name_B;
        } else {
          return `test.event_NH_${index}.random.${Math.random()}`;
        }
      }

      beforeEach(() => {
        dispatcher = new EventDispatcher();

        for(let index = 0; index < mock_handlers.length; index++) {
          mock_handlers[index] = new EventHandler({event_name: generate_event_name_for_handler(index)});
          mock_handlers[index].dispatch = sinon.stub();
          mock_handlers[index].revert = sinon.stub();
          mock_handlers[index].supports_revert = true;
          mock_handler_ids[index] = dispatcher.load_event_handler(mock_handlers[index]);
        }

        for(let index = 0; index < mock_events.length; index++) {
          mock_events[index] = new Event(generate_event_name_for_event(index), Math.random());
        }
        // Add all events to dispatcher
        mock_events.forEach(event => {
          dispatcher.enqueue_event(event);
        });
      });

      describe('error_on_unhandled_events = true', () => {
        it('Should dispatch event and emit error since no handlers existed', () => {
          const spy_handler = sinon.spy();
          const mock_event = mock_events[4]; // Event 5 has no handlers

          dispatcher.error_on_unhandled_events = true;
          dispatcher.on('error', spy_handler);

          return dispatcher.dispatch_event(mock_event).then(() => {
            // Event handler dispatch should have been called with correct args
            sinon.assert.callCount(spy_handler, 1);
            let error_thrown = spy_handler.lastCall.args[0];
            expect(error_thrown.message).to.equal(
              `No handlers found for event ${mock_event.event_name}.`
            );
            expect(error_thrown).to.be.instanceof(Error);
          });
        });
      });

      describe('with 3 handlers', () => {

        let spy_handler;
        let which_handlers;
        let mock_event;
        let event_name;
        const which_handlers_slice_start = 0;
        const which_handlers_slice_end = 3;
        const which_handlers_slice_length = which_handlers_slice_end - which_handlers_slice_start;

        beforeEach(() => {
          spy_handler = sinon.stub();
          which_handlers = mock_handlers.slice(which_handlers_slice_start, which_handlers_slice_end);
          mock_event = mock_events[0];
          event_name = mock_event.event_name;
        });

        describe('Dispatching event', () => {

          beforeEach(() => {
            dispatcher.on('dispatch', spy_handler);
          });

          it('Should emit event on dispatch success', () => {
            return dispatcher.dispatch_event(mock_event).then(() => {
              // Event handler dispatch should have been called with correct args
              sinon.assert.callCount(spy_handler, which_handlers.length);
              which_handlers.forEach(which_handler => {
                sinon.assert.calledWith(spy_handler, mock_event, which_handler);
                sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
              });
            });
          });

          it('Should enqueue an event while being dispatched', () => {
            const mock_event_data = Math.random();
            const mock_new_event_name = `new_event_${Math.random()}`;
            new_mock_event = new Event(mock_new_event_name, mock_event_data);
            which_handlers.forEach(which_handler => {
              which_handler.dispatch = function(data) {
                this.emit('enqueue_event', new_mock_event);
              }
            });
            return dispatcher.dispatch_event(mock_event).then(() => {
              const new_events = dispatcher.event_queue.filter(event => event.event_name === mock_new_event_name);
              expect(new_events.length).to.equal(which_handlers.length);
              new_events.forEach(event => {
                expect(event.event_name).to.equal(mock_new_event_name);
                expect(event.data).to.equal(mock_event_data);
              });
            });
          });

          describe('enqueue_complete_event = true', () => {
            const mock_complete_data = Math.random();
            beforeEach(() => {
              which_handlers.forEach(which_handler => {
                which_handler.enqueue_complete_event = true;
                which_handler.dispatch.returns(mock_complete_data);
              });
            });
            it('Should enqueue an EventComplete when dispatching an event', () => {
              return dispatcher.dispatch_event(mock_event).then(() => {
                const new_events = dispatcher.event_queue.filter(event => event.constructor.name === 'EventComplete');
                expect(new_events.length).to.equal(which_handlers.length);
                new_events.forEach(event => {
                  expect(event.event_name).to.equal(`${event_name}.complete`);
                  expect(event.data).to.equal(mock_complete_data);
                });
              });
            });
            it('Should not enqueue an EventComplete for dispatching EventComplete event', () => {
              const mock_complete_event = new EventComplete(mock_event, mock_complete_data);
              mock_complete_event.event_name = event_name;

              return dispatcher.dispatch_event(mock_complete_event).then(() => {
                const new_events = dispatcher.event_queue.filter(event => event.constructor.name === 'EventComplete');
                // There should be no EventCompletes enqueued
                expect(new_events.length).to.equal(0);
              });
            });
          });

          describe('should_handle = ...', () => {
            it('Should not dispatch any of the handlers, should_handle returns false', () => {
              which_handlers.forEach(which_handler => {
                which_handler.should_handle = sinon.stub().returns(false);
              });
              return dispatcher.dispatch_event(mock_event).then(() => {
                which_handlers.forEach(which_handler => {
                  sinon.assert.callCount(which_handler.dispatch, 0);
                  sinon.assert.calledWith(which_handler.should_handle, mock_event);
                });
              });
            });
            it('Should dispatch all of the handlers, should_handle returns true', () => {
              which_handlers.forEach(which_handler => {
                which_handler.should_handle = sinon.stub().returns(true);
              });
              return dispatcher.dispatch_event(mock_event).then(() => {
                which_handlers.forEach(which_handler => {
                  sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
                  sinon.assert.calledWith(which_handler.should_handle, mock_event);
                });
              });
            });
          });

          describe('transform_function = ...', () => {
            it('Should call transform_function with event data', () => {
              const mock_event_pass_data = Math.random();
              const mock_new_data = Math.random();
              which_handlers.forEach(which_handler => {
                which_handler.transform_function = sinon.stub().returns(mock_new_data);
                which_handler.dispatch.resolves(mock_event_pass_data);
              });
              return dispatcher.dispatch_event(mock_event).then(() => {
                which_handlers.forEach(which_handler => {
                  sinon.assert.calledWith(which_handler.transform_function, mock_event_pass_data);
                });
              });
            });
            describe('transform_function as async', () => {
              const mock_event_pass_data = Math.random();
              const mock_new_data = Math.random();
              let resolve_callbacks = [];
              let ret_promise;
              beforeEach(() => {
                spy_handler = sinon.spy();
                dispatcher.addListener('dispatch', spy_handler);
                which_handlers.forEach(which_handler => {
                  which_handler.transform_function = sinon.stub()
                    .resolves(
                      Promise.resolve()
                      .then(() => {
                        return new Promise((resolve, reject) => {
                          resolve_callbacks.push(resolve);
                        });
                      })
                    );
                  which_handler.enqueue_complete_event = true;
                  which_handler.dispatch.resolves(mock_event_pass_data);
                });
                ret_promise = dispatcher.dispatch_event(mock_event);
              });
              it('Should enqueue EventComplete after transform_function resolves', () => {
                const get_event_complete_events = () => {
                  return dispatcher.event_queue.filter(event => event.constructor.name === 'EventComplete');
                }
                return immmediatePromise()
                  .then(() => {
                    expect(get_event_complete_events().length).to.equal(0);
                    return immmediatePromise();
                  })
                  .then(() => {
                    // Release transform_function
                    resolve_callbacks.forEach(fn => fn()); // Call each resolve
                    return immmediatePromise();
                  })
                  .then(() => {
                    expect(get_event_complete_events().length).to.equal(which_handlers.length);
                    return ret_promise;
                  });
              });
              it('Should emit dispatch after transform_function resolves', () => {
                return immmediatePromise()
                  .then(() => {
                    sinon.assert.callCount(spy_handler, 0);
                    return immmediatePromise();
                  })
                  .then(() => {
                    // Release transform_function
                    resolve_callbacks.forEach(fn => fn()); // Call each resolve
                    return immmediatePromise();
                  })
                  .then(() => {
                    sinon.assert.callCount(spy_handler, which_handlers.length);
                    return ret_promise;
                  });
              });
            });
            it('Should call enqueue CompleteEvent with new event data', () => {
              const mock_event_pass_data = Math.random();
              const mock_new_data = Math.random();
              which_handlers.forEach(which_handler => {
                which_handler.transform_function = sinon.stub().returns(mock_new_data);
                which_handler.dispatch.resolves(mock_event_pass_data);
                which_handler.enqueue_complete_event = true;
              });
              return dispatcher.dispatch_event(mock_event).then(() => {
                const new_events = dispatcher.event_queue.filter(event => event.constructor.name === 'EventComplete');
                expect(new_events.length).to.equal(which_handlers.length);
                new_events.forEach(event => {
                  expect(event.event_name).to.equal(`${event_name}.complete`);
                  expect(event.data).to.equal(mock_new_data);
                });
              });
            });
          });

          describe('defer_dispatch = ...', () => {
            const test_defer_event_name = `test_defer.${Math.random()}`;
            beforeEach(() => {
              which_handlers.forEach(which_handler => {
                which_handler.defer_dispatch = {
                  event_name: test_defer_event_name,
                  check_function: sinon.stub().returns(true),
                }
              });
            });

            it('Should dispatch all handlers only after defer_dispatch resolves', () => {
              const promise = dispatcher.dispatch_event(mock_event);
              return Promise.resolve()
                .then(() => {
                  // Shouldn't be dispatched yet
                  which_handlers.forEach(which_handler => {
                    sinon.assert.notCalled(which_handler.dispatch);
                    sinon.assert.notCalled(which_handler.defer_dispatch.check_function);
                  });
                  return immmediatePromise();
                })
                .then(() => {
                  // Triggering this event will allow defer_dispatch.check_function to be checked
                  dispatcher.emit(test_defer_event_name, mock_event.data);
                  return immmediatePromise();
                })
                .then(() => {
                  // Should now be dispatched
                  which_handlers.forEach(which_handler => {
                    sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
                    sinon.assert.calledWith(which_handler.defer_dispatch.check_function, mock_event.data);
                  });

                  return promise;
                });
            });

            it('Should dispatch 2 events at first, and then the last momentarily after', () => {
              const promise = dispatcher.dispatch_event(mock_event);
              const emit_mock_data = Math.random();
              which_handlers[0].defer_dispatch.check_function.returns(false);
              return Promise.resolve()
                .then(() => {
                  // Shouldn't be dispatched yet
                  which_handlers.forEach(handler => {
                    sinon.assert.notCalled(handler.dispatch);
                    sinon.assert.notCalled(handler.defer_dispatch.check_function);
                  });
                  return immmediatePromise();
                })
                .then(() => {
                  // Triggering this event will allow defer_dispatch.check_function to be checked
                  dispatcher.emit(test_defer_event_name, emit_mock_data);
                  return immmediatePromise();
                })
                .then(() => {
                  // Last two should be dispatched, but not 0
                  sinon.assert.notCalled(which_handlers[0].dispatch);
                  sinon.assert.calledWith(which_handlers[1].dispatch, mock_event.data);
                  sinon.assert.calledWith(which_handlers[2].dispatch, mock_event.data);
                  // But all check_functions should have been called
                  which_handlers.forEach(handler => {
                    sinon.assert.calledWith(handler.defer_dispatch.check_function, emit_mock_data);
                  });
                  return immmediatePromise();
                })
                .then(() => {
                  // Triggering this event will allow defer_dispatch.check_function to be checked
                  which_handlers[0].defer_dispatch.check_function.returns(true);
                  dispatcher.emit(test_defer_event_name, emit_mock_data);
                  return immmediatePromise();
                })
                .then(() => {
                  // Now all should now be dispatched
                  which_handlers.forEach(handler => {
                    sinon.assert.calledWith(handler.dispatch, mock_event.data);
                    sinon.assert.calledWith(handler.defer_dispatch.check_function, emit_mock_data);
                  });

                  return promise;
                });
            });

            it('Should emit error if defer_dispatch.check_function throws error', () => {
              const mock_dispatch_data = Math.random();
              const mock_emit_data = Math.random();
              const mock_error = new Error('Defer check fail ' + Math.random());
              const emit_error_spy = sinon.spy();
              dispatcher.on('error', emit_error_spy);
              const throw_handler = which_handlers[0];
              throw_handler.defer_dispatch.check_function.throws(mock_error);
              const dont_throw_handlers = which_handlers.filter((handler) => handler !== throw_handler);

              const promise = dispatcher.dispatch_event(mock_event);

              return Promise.resolve()
                .then(() => {
                  // Shouldn't be dispatched yet
                  which_handlers.forEach(handler => {
                    sinon.assert.notCalled(handler.dispatch);
                    sinon.assert.notCalled(handler.defer_dispatch.check_function);
                  });
                  return immmediatePromise();
                })
                .then(() => {
                  // Triggering this event will allow defer_dispatch.check_function to be checked
                  dispatcher.emit(test_defer_event_name, mock_emit_data);
                  return immmediatePromise();
                })
                .then(() => {
                  sinon.assert.called(emit_error_spy);
                  let error_thrown = emit_error_spy.lastCall.args[0];
                  expect(error_thrown).to.be.instanceof(EventHandleError);
                  expect(error_thrown.culprit).to.equal(mock_error);
                  expect(error_thrown.handler).to.equal(which_handlers[0]);
                  expect(error_thrown.event).to.equal(mock_event);
                  dont_throw_handlers.forEach(which_handler => {
                    sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
                    sinon.assert.calledWith(which_handler.defer_dispatch.check_function, mock_emit_data);
                  });
                });
            });
          });

          for(let index = 0; index < which_handlers_slice_length; index++) {
            it(`Should dispatch event only for specific handlers test #${index + 1}`, () => {
              const which_handler = which_handlers[index];
              const dont_fire_handlers = which_handlers.filter((handler) => handler !== which_handler);
              const which_handler_id = mock_handler_ids[index];
              return dispatcher.dispatch_event(mock_event, which_handler_id).then(() => {
                // Event handler dispatch should have been called with correct args
                sinon.assert.callCount(spy_handler, 1);
                sinon.assert.calledWith(spy_handler, mock_event, which_handler);
                sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
                dont_fire_handlers.forEach(dont_fire_handler => {
                  sinon.assert.neverCalledWith(spy_handler, mock_event, dont_fire_handler);
                  sinon.assert.neverCalledWith(dont_fire_handler.dispatch, mock_event.data);
                });
              });
            });
          }
        });

        describe('Reverting event', () => {

          beforeEach(() => {
            dispatcher.on('reverted', spy_handler);
          });

          it('Should emit event when revert success', () => {
            return dispatcher.revert_event(mock_event).then(() => {
              sinon.assert.callCount(spy_handler, which_handlers.length);
              which_handlers.forEach(which_handler => {
                sinon.assert.calledWith(spy_handler, mock_event, which_handler);
                sinon.assert.calledWith(which_handler.revert, mock_event.data);
              });
            });
          });

          for(let index = 0; index < which_handlers_slice_length; index++) {
            it(`Should revert event only for specific handlers test #${index + 1}`, () => {
              const which_handler = which_handlers[index];
              const dont_fire_handlers = which_handlers.filter((handler) => handler !== which_handler);
              const which_handler_id = mock_handler_ids[index];
              return dispatcher.revert_event(mock_event, which_handler_id).then(() => {
                // Event handler revert should have been called with correct args
                sinon.assert.callCount(spy_handler, 1);
                sinon.assert.calledWith(spy_handler, mock_event, which_handler);
                sinon.assert.calledWith(which_handler.revert, mock_event.data);
                dont_fire_handlers.forEach(dont_fire_handler => {
                  sinon.assert.neverCalledWith(spy_handler, mock_event, dont_fire_handler);
                  sinon.assert.neverCalledWith(dont_fire_handler.revert, mock_event.data);
                });
              });
            });
          }
        });

        describe('Throwing errors', () => {
          let spy_catcher;
          beforeEach(() => {
            spy_catcher = sinon.spy();
            dispatcher.on('error', spy_catcher);
          });
          describe('on dispatch', () => {
            beforeEach(() => {
              dispatcher.on('dispatch', spy_handler);
            });

            for(let index = 0; index < which_handlers_slice_length; index++) {
              it(`Should throw error for handler #${index + 1}`, () => {
                const which_handler = which_handlers[index];
                const dont_throw_handlers = which_handlers.filter((handler) => handler !== which_handler);
                const which_handler_id = mock_handler_ids[index];
                const mock_error = new Error(Math.random());
                which_handler.dispatch.throws(mock_error);
                return dispatcher.dispatch_event(mock_event).then(() => {
                  sinon.assert.callCount(which_handler.dispatch, 1);
                  sinon.assert.calledWith(which_handler.dispatch, mock_event.data);
                  sinon.assert.neverCalledWith(spy_handler, mock_event, which_handler);
                  sinon.assert.callCount(spy_catcher, 1);
                  let error_thrown = spy_catcher.lastCall.args[0];
                  expect(error_thrown).to.be.instanceof(EventHandleError);
                  expect(error_thrown.event).to.deep.equal(mock_event);
                  expect(error_thrown.handler).to.deep.equal(which_handler);
                  expect(error_thrown.culprit).to.deep.equal(mock_error);

                  dont_throw_handlers.forEach(dont_throw_handler => {
                    sinon.assert.calledWith(spy_handler, mock_event, dont_throw_handler);
                    sinon.assert.calledWith(dont_throw_handler.dispatch, mock_event.data);
                  });
                });
              });
            }
          });

          describe('on revert', () => {
            beforeEach(() => {
              dispatcher.on('reverted', spy_handler);
            });

            for(let index = 0; index < which_handlers_slice_length; index++) {
              it(`Should throw error for handler #${index + 1}`, () => {
                const which_handler = which_handlers[index];
                const dont_throw_handlers = which_handlers.filter((handler) => handler !== which_handler);
                const which_handler_id = mock_handler_ids[index];
                const mock_error = new Error(Math.random());
                which_handler.revert.throws(mock_error);

                return dispatcher.revert_event(mock_event).then(() => {
                  sinon.assert.callCount(which_handler.revert, 1);
                  sinon.assert.calledWith(which_handler.revert, mock_event.data);
                  sinon.assert.neverCalledWith(spy_handler, mock_event, which_handler);
                  sinon.assert.callCount(spy_catcher, 1);
                  let error_thrown = spy_catcher.lastCall.args[0];
                  expect(error_thrown).to.be.instanceof(EventHandleError);
                  expect(error_thrown.event).to.deep.equal(mock_event);
                  expect(error_thrown.handler).to.deep.equal(which_handler);
                  expect(error_thrown.culprit).to.deep.equal(mock_error);

                  dont_throw_handlers.forEach(dont_throw_handler => {
                    sinon.assert.calledWith(spy_handler, mock_event, dont_throw_handler);
                    sinon.assert.calledWith(dont_throw_handler.revert, mock_event.data);
                  });
                });
              });
            }
          });
        })
      });

      describe('Run (dispatch all events)', () => {

        let handler_expected = Array(3);

        beforeEach(() => {
          handler_expected = [
            {
              handlers: mock_handlers.slice(0,3),
              events: mock_events.slice(0,1),
            },
            {
              handlers: mock_handlers.slice(3,5),
              events: mock_events.slice(1,3),
            },
            {
              handlers: mock_handlers.slice(5,mock_handlers.length),
              events: [],
            }
          ];
        });


        it('Should remove all events in queue', () => {
          return dispatcher.run().then(() => {
            expect(dispatcher.event_queue_count).to.equal(0);
          });
        });

        for(let index = 0; index < handler_expected.length; index++) {
          it(`Should call dispatch on handlers for particular events. test #${index + 1}`, () => {
            return dispatcher.run().then(() => {
              handler_expected[index].handlers.forEach(which_handler => {
                if(handler_expected[index].events) {
                  handler_expected[index].events.forEach(which_event => {
                    sinon.assert.calledWith(which_handler.dispatch, which_event.data);
                  });
                } else {
                  sinon.assert.callCount(which_handler.dispatch, 0);
                }
              });
            });
          });
        }
      });
    });
  });
});
