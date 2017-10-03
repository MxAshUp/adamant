const // Test tools
  chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert,
  sinon = require('sinon'),
  _ = require('lodash'),
  // Modules to test
  EventHandler = require('../libs/components/event-handler'),
  Workflow = require('../libs/components/workflow');

describe('Workflow EventHandler', () => {

  describe('constructor', () => {
    it('Should create an instance', () => {
      const workflowInstance = new Workflow();
      expect(workflowInstance).to.be.instanceOf(Workflow);
    });
    it('Should create several instances all with unique workflow_name');
    it('Should create an instance and set the workflow_name');
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

    describe('get_current_step', () => {
      it('Should return 1', () => {
        expect(workflowInstance.get_current_step()).to.equal(1);
      });

      it('Should return 2 after registering a step', () => {
        const mock_next_step = new EventHandler();
        workflowInstance.register_step(mock_next_step);
        expect(workflowInstance.get_current_step()).to.equal(2);
      });

      it('Should return 3 after registering two steps', () => {
        const mock_next_step = new EventHandler();
        workflowInstance.register_step(mock_next_step);
        const mock_next_step_2 = new EventHandler();
        workflowInstance.register_step(mock_next_step_2);
        expect(workflowInstance.get_current_step()).to.equal(3);
      });
    });

    describe('format_event_name', () => {
      const mock_step_number = Math.floor(Math.random()*100); // Random int between 0 and 100
      const mock_event_name = `mock_event.${Math.random()}`;
      it(`Should return correct event_name`, () => {
        expect(workflowInstance.format_event_name(mock_step_number, mock_event_name)).to.equal(`${mock_workflow_name}.step_${mock_step_number}.${mock_event_name}`);
      });
      it('Should return correct event_name - without event_name as param');
      it('Should return correct event_name - without workflow_name');
    });

    describe('register_step', () => {
      let mock_second_step;
      let mock_third_step;
      const mock_third_step_name = `event_name${Math.random()}`;

      beforeEach(() => {
        mock_second_step = new EventHandler();
        mock_third_step = new EventHandler({event_name: mock_third_step_name});
        workflowInstance.register_step(mock_second_step);
        workflowInstance.register_step(mock_third_step);
      });

      it(`Should set handler event_name to ${mock_workflow_name}.step_1`, () => {
        expect(mock_second_step.event_name).to.equal(`${mock_workflow_name}.step_1`);
      });

      it(`Should set handler event_name to ${mock_workflow_name}.step_1.${mock_third_step_name}`, () => {
        expect(mock_third_step.event_name).to.equal(`${mock_workflow_name}.step_2.${mock_third_step_name}`);
      });

      it('Should return self (to be chainable)');

      describe('wrapped transform_function', () => {
        it('Should set previous handler transform_function to wrapped function');
        it('Should emit enqueue event when called');
        it('Should emit enqueue event that has event name equal to next event name');
        it('Should emit enqueue event that has event data passed from previous event');
      });

    });
  });
});