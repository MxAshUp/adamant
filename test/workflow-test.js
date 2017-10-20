// Test tools
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const sinon = require('sinon');
const _ = require('lodash');
// Modules to test
const EventHandler = require('../libs/components/event-handler');
const Workflow = require('../libs/components/workflow');

describe('Workflow EventHandler', () => {

  describe('Function constructor', () => {
    it('Should create an instance', () => {
      const workflowInstance = new Workflow({event_name: 'mock_event'});
      expect(workflowInstance).to.be.instanceOf(Workflow);
    });
    it('Should create an instance and set the workflow_name', () => {
      const workflowInstance = new Workflow({event_name: 'mock_event'});
      expect(workflowInstance.workflow_name).to.not.be.empty;
    });
    it('Should create several instances all with unique workflow_name', () => {
      const number_of_instances = 100;
      const instance_array = [];
      for(let i = 0; i < number_of_instances; i ++) {
        instance_array.push(new Workflow({event_name: 'mock_event'}));
      }
      expect(_.uniqBy(instance_array, 'workflow_name').length).to.equal(number_of_instances);
    });
    it('Should create several instances where workflow_name matches regex', () => {
      for(let i = 0; i < 100; i ++) {
        const instance = new Workflow({event_name: 'mock_event'});
        expect(instance.workflow_name).to.match(/workflow_[\d]+/);
      }
    });
    it('Should pass EventHandler arguments to super constructor', () => {
      const construct_args = {
        event_name: Math.random(),
        should_handle: Math.random(),
        defer_dispatch: Math.random(),
        enqueue_complete_event: Math.random(),
      };
      const instance = new Workflow(construct_args);
      expect(instance).to.deep.include(construct_args);
    })
  });

  describe('instance tests', () => {

    let workflowInstance;
    const mock_original_step_name = `mock_event${Math.random()}`;
    const mock_workflow_name = `mock_workflow${Math.random()}`;

    beforeEach(() => {
      workflowInstance = new Workflow({
        event_name: mock_original_step_name,
        workflow_name: mock_workflow_name,
      });
    });

    describe('Function get_current_step', () => {
      it('Should return 1', () => {
        expect(workflowInstance.get_current_step()).to.equal(1);
      });

      it('Should return 2 after registering a step', () => {
        const mock_next_step = new EventHandler({event_name: 'mock_event'});
        workflowInstance.step(mock_next_step);
        expect(workflowInstance.get_current_step()).to.equal(2);
      });

      it('Should return 3 after registering two steps', () => {
        const mock_next_step = new EventHandler({event_name: 'mock_event'});
        workflowInstance.step(mock_next_step);
        const mock_next_step_2 = new EventHandler({event_name: 'mock_event'});
        workflowInstance.step(mock_next_step_2);
        expect(workflowInstance.get_current_step()).to.equal(3);
      });
    });

    describe('Function format_event_name', () => {
      const mock_step_number = Math.floor(Math.random()*100); // Random int between 0 and 100
      const mock_event_name = `mock_event.${Math.random()}`;
      it(`Should return correct event_name`, () => {
        expect(workflowInstance.format_event_name(mock_step_number, mock_event_name)).to.equal(`${mock_workflow_name}.step_${mock_step_number}.${mock_event_name}`);
      });
      it('Should return correct event_name - without event_name as param', () => {
        expect(workflowInstance.format_event_name(mock_step_number)).to.equal(`${mock_workflow_name}.step_${mock_step_number}`);
      });
      it('Should return correct event_name - without workflow_name', () => {
        workflowInstance.workflow_name = '';
        expect(workflowInstance.format_event_name(mock_step_number, mock_event_name)).to.equal(`step_${mock_step_number}.${mock_event_name}`);
      });
      it('Should return correct event_name - without workflow_name and event_name', () => {
        workflowInstance.workflow_name = '';
        expect(workflowInstance.format_event_name(mock_step_number)).to.equal(`step_${mock_step_number}`);
      });
    });

    describe('Function step', () => {
      const mock_steps_count = 5;
      const mock_steps_no_event_name = [];//2,3];
      const mock_steps_no_transform_function = [2,4];
      const mock_event_steps = Array(mock_steps_count);
      const mock_event_step_names = Array(mock_steps_count);
      const mock_event_step_transform_function = Array(mock_steps_count);

      for(let step_number of mock_event_steps.keys()) {
        if(mock_steps_no_event_name.indexOf(step_number) === -1) {
          mock_event_step_names[step_number] = `event_name${Math.random()}`;
        }
      }

      beforeEach(() => {
        for(let step_number of mock_event_steps.keys()) {
          const construct_args = {
            event_name: mock_event_step_names[step_number],
          };
          if(mock_steps_no_transform_function.indexOf(step_number) === -1) {
            mock_event_step_transform_function[step_number] = sinon.stub();
            construct_args.transform_function = mock_event_step_transform_function[step_number];
          }
          mock_event_steps[step_number] = new EventHandler(construct_args);
          workflowInstance.step(mock_event_steps[step_number]);
        }
      });

      for(let step_number of mock_event_steps.keys()) {
        it(`Should reassigned handler event_name for step ${step_number + 1}`, () => {
          if(mock_steps_no_event_name.indexOf(step_number) === -1) {
            expect(mock_event_steps[step_number].event_name).to.equal(`${mock_workflow_name}.step_${step_number + 1}.${mock_event_step_names[step_number]}`);
          } else {
            expect(mock_event_steps[step_number].event_name).to.equal(`${mock_workflow_name}.step_${step_number + 1}`);
          }
        });
      }

      it('Should return self (to be chainable)', () => {
        const mock_step = new EventHandler({event_name: 'mock_event'});
        const returned_value = workflowInstance.step(mock_step);
        expect(returned_value).to.equal(workflowInstance);
      });

      describe('When transform function returns falsey', () => {
        const handler_spy = sinon.spy();
        const original_mock_data = Math.random();
        let mock_return;
        beforeEach(() => {
          workflowInstance.addListener('enqueue_event', handler_spy);
          // Set second step to return nothing
          mock_event_step_transform_function[1].returns();
          mock_return = mock_event_steps[1].transform_function(original_mock_data);
        });

        it('Should not enqueue next event', () => {
          return mock_return.then(() => {
            sinon.assert.notCalled(handler_spy);
          });
        });
      });

      describe('Calling wrapped transform_function', () => {

        for(let step_number of mock_event_steps.keys()) {
          const is_last_step = step_number == mock_event_steps.length - 1;

          describe(`(Step #${step_number + 1})`, () => {
            const handler_spy = sinon.spy();
            const transform_return = Math.random();
            const original_mock_data = Math.random();
            let mock_return;

            beforeEach(() => {
              workflowInstance.addListener('enqueue_event', handler_spy);
              if(mock_steps_no_transform_function.indexOf(step_number) === -1) {
                mock_event_step_transform_function[step_number].returns(transform_return);
              }
              if(mock_event_steps[step_number].transform_function) {
                mock_return = mock_event_steps[step_number].transform_function(original_mock_data);
              } else {
                mock_return = undefined;
              }
            });

            if(mock_steps_no_transform_function.indexOf(step_number) === -1) {
              it(`Should make call to original transform_function`, () => {
                return mock_return.then(() => {
                  sinon.assert.calledWith(mock_event_step_transform_function[step_number], original_mock_data);
                });
              });

              it('Should return data from original transform_function', () => {
                return mock_return.then((data) => {
                  expect(data).to.equal(transform_return);
                });
              });
            }

            if(!is_last_step) {
              describe('(Not last step)', () => {
                let next_step;
                let event_data;

                beforeEach(() => {
                  next_step = mock_event_steps[step_number + 1];
                  event_name = handler_spy.lastCall.args[0];
                  event_data = handler_spy.lastCall.args[1];
                });

                it('Should emit enqueue event that has event name equal to next event name', () => {
                  expect(event_name).to.equal(next_step.event_name);
                });

                it('Should emit enqueue event that has event data passed from previous event', () => {
                  if(mock_steps_no_transform_function.indexOf(step_number) === -1) {
                    expect(event_data).to.equal(transform_return);
                  } else {
                    expect(event_data).to.equal(original_mock_data);
                  }
                });

              });
            } else {
              describe('(Last step)', () => {
                it('Should not emit enqueue_event', () => {
                  sinon.assert.notCalled(handler_spy);
                });
              });
            }
          });
        }
      });
    });
  });
});