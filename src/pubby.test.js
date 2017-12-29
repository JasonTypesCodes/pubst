const clearRequire = require('clear-require');
const chai = require('chai');

chai.use(require('sinon-chai'));

const expect = chai.expect;
const sinon = require('sinon');

describe('pubby', () => {
  let pubby;
  const TEST_TOPIC_1 = 'test.topic.one';
  const TEST_TOPIC_2 = 'test.topic.two';

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    pubby = require('./pubby');
  });

  afterEach(() => {
    clock.restore();
    clearRequire('./pubby');
  });

  describe('currentVal', () => {
    it('returns the current value', () => {
      const testValue = 'some value';

      pubby.publish(TEST_TOPIC_1, testValue);

      expect(pubby.currentVal(TEST_TOPIC_1)).to.equal(testValue);
    });

    it('returns the current value with a default', () => {
      const testValue = 'some value';
      const myDefault = 'some default';

      pubby.publish(TEST_TOPIC_1, testValue);

      expect(pubby.currentVal(TEST_TOPIC_1, myDefault)).to.equal(testValue);
    });

    it('returns the default value if current was never set', () => {
      const myDefault = 'some default';

      expect(pubby.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns the default value if current was set to null', () => {
      const myDefault = 'some default';

      pubby.publish(TEST_TOPIC_1, null);

      expect(pubby.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns undefined if value was not set and no default is provided', () => {
      expect(pubby.currentVal(TEST_TOPIC_1)).to.be.an('undefined');
    });

    it('returns null if value was set to null and no default is provided', () => {
      pubby.publish(TEST_TOPIC_1, null);
      expect(pubby.currentVal(TEST_TOPIC_1)).to.equal(null);
    });

    it('returns null if value was not set and a default of null is provided', () => {
      expect(pubby.currentVal(TEST_TOPIC_1, null)).to.equal(null);
    });
  });

  describe('publish', () => {
    it('sets a payload for a topic', () => {
      const payload1 = 'payload1';
      const payload2 = 'payload2';

      expect(pubby.currentVal(TEST_TOPIC_1)).to.be.an('undefined');

      pubby.publish(TEST_TOPIC_1, payload1);

      expect(pubby.currentVal(TEST_TOPIC_1)).to.equal(payload1);

      pubby.publish(TEST_TOPIC_1, payload2);

      expect(pubby.currentVal(TEST_TOPIC_1)).to.equal(payload2);
    });
  });

  describe('publish & subscribe', () => {
    it('calls the subscriber if the topic already has a set value', () => {
      const testPayload = 'some test payload';
      const handler = sinon.spy();

      pubby.publish(TEST_TOPIC_1, testPayload);

      pubby.subscribe(TEST_TOPIC_1, handler);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has not been set', () => {
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubby.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has been set with null', () => {
      const testPayload = 'test payload';
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubby.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      pubby.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.reset();

      pubby.publish(TEST_TOPIC_1, null);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('calls all the subscribers for a topic', () => {
      const testPayload = 'test payload';

      const topic1Handler1 = sinon.spy();
      const topic1Handler2 = sinon.spy();
      const topic2Handler1 = sinon.spy();
      const topic2Handler2 = sinon.spy();

      pubby.subscribe(TEST_TOPIC_1, topic1Handler1);
      pubby.subscribe(TEST_TOPIC_1, topic1Handler2);
      pubby.subscribe(TEST_TOPIC_2, topic2Handler1);
      pubby.subscribe(TEST_TOPIC_2, topic2Handler2);

      pubby.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(topic1Handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      expect(topic1Handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_1);

      expect(topic2Handler1).not.to.have.been.called;
      expect(topic2Handler2).not.to.have.been.called;

      topic1Handler1.reset();
      topic1Handler2.reset();
      topic2Handler1.reset();
      topic2Handler2.reset();

      pubby.publish(TEST_TOPIC_2, testPayload);

      clock.tick(1);

      expect(topic1Handler1).not.to.have.been.called;
      expect(topic1Handler2).not.to.have.been.called;

      expect(topic2Handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
      expect(topic2Handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
    });

    it('allows subscribers to unsunscribe', () => {
      const testPayload1 = 'test payload 1';
      const testPayload2 = 'test payload 2';
      const testPayload3 = 'test payload 3';

      const handler1 = sinon.spy();
      const handler2 = sinon.spy();

      const unsub1 = pubby.subscribe(TEST_TOPIC_1, handler1);
      const unsub2 = pubby.subscribe(TEST_TOPIC_1, handler2);

      pubby.publish(TEST_TOPIC_1, testPayload1);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

      handler1.reset();
      handler2.reset();

      unsub1();

      pubby.publish(TEST_TOPIC_1, testPayload2);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).to.have.been.calledWith(testPayload2, TEST_TOPIC_1);

      handler1.reset();
      handler2.reset();

      unsub2();

      pubby.publish(TEST_TOPIC_1, testPayload3);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).not.to.have.been.called;
    });
  });

});
