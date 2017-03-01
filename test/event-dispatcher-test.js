const expect = require('chai').expect,
  rewire = require("rewire"),
  EventDispatcher = require('../include/event-dispatcher');

describe('Event Dispatcher', () => {

  const dispatcher = new EventDispatcher();
  // dispatcher.load_event();

  // dispatcher.enqueue_event();

  // let event = dispatcher.shift_event();
  // if(event) {
  //   dispatcher.dispatch_event(event.name, event.data);
  // }
  it('Should enqueue 4 events.');
  it('Should remove 1 event from queue.');
  it('Should dispatch first event.');
  it('Should return revert data.');
  it('Should revert first event with revert data.');
});
