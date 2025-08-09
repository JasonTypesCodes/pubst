const clearModule = require('clear-module');
const chai = require('chai');

chai.use(require('sinon-chai'));

const expect = chai.expect;
const sinon = require('sinon');

describe('pubst', () => {
  let pubst;
  const TEST_TOPIC_1 = 'test.topic.one';
  const TEST_TOPIC_2 = 'test.topic.two';

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    pubst = require('./pubst');
    pubst.configure({showWarnings: false});
  });

  afterEach(() => {
    clock.restore();
    clearModule('./pubst');
  });

  describe('currentVal', () => {
    it('returns the current value', () => {
      const testValue = 'some value';

      pubst.publish(TEST_TOPIC_1, testValue);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(testValue);
    });

    it('returns the current value with a default', () => {
      const testValue = 'some value';
      const myDefault = 'some default';

      pubst.publish(TEST_TOPIC_1, testValue);

      expect(pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(testValue);
    });

    it('returns the default value if current was never set', () => {
      const myDefault = 'some default';

      expect(pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns the default value if current was set to null', () => {
      const myDefault = 'some default';

      pubst.publish(TEST_TOPIC_1, null);

      expect(pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns undefined if value was not set and no default is provided', () => {
      expect(pubst.currentVal(TEST_TOPIC_1)).to.be.an('undefined');
    });

    it('returns null if value was set to null and no default is provided', () => {
      pubst.publish(TEST_TOPIC_1, null);
      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(null);
    });

    it('returns null if value was not set and a default of null is provided', () => {
      expect(pubst.currentVal(TEST_TOPIC_1, null)).to.equal(null);
    });

    it('returns topic default if value was not set and no default is provided', () => {
      const myDefault = 'some default';

      pubst.addTopic({
        name: TEST_TOPIC_1,
        default: myDefault
      });

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(myDefault);
    });

    it('returns provided default if value was not set and topic was configured with a default', () => {
      const myDefault = 'some default';
      const topicDefault = 'topic default';

      pubst.addTopic({
        name: TEST_TOPIC_1,
        default: topicDefault
      });

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(topicDefault);
      expect(pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });
  });

  describe('publish', () => {
    it('sets a payload for a topic', () => {
      const payload1 = 'payload1';
      const payload2 = 'payload2';

      expect(pubst.currentVal(TEST_TOPIC_1)).to.be.an('undefined');

      pubst.publish(TEST_TOPIC_1, payload1);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(payload1);

      pubst.publish(TEST_TOPIC_1, payload2);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(payload2);
    });
  });

  describe('topic config', () => {
    describe('name', () => {
      it('is required', () => {
        let errorThrown = false;

        try {
          pubst.addTopic({});
        } catch (e) {
          errorThrown = true;
        }

        expect(errorThrown).to.be.true;
      });
    });

    describe('default', () => {
      it('is configurable', () => {
        const handler = sinon.spy();
        const defaultVal = 'DEFAULT VALUE';

        pubst.addTopic({
          name: TEST_TOPIC_1,
          default: defaultVal,
          doPrime: false
        });

        pubst.publish(TEST_TOPIC_1, 'SOME VALUE');

        pubst.subscribe(TEST_TOPIC_1, handler);

        pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);
      });

      it('is off by default', () => {
        const handler = sinon.spy();

        pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        clock.tick(1);

        expect(handler).not.to.have.been.called;
      });

      it('is sent again after a clear', () => {
        const handler = sinon.spy();
        const defaultVal = 'SOME DEFAULT';
        const aValue = 'A real value';

        pubst.addTopic({
          name: TEST_TOPIC_1,
          default: defaultVal,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);

        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1, aValue);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(aValue, TEST_TOPIC_1);

        handler.resetHistory();

        pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);
      });

      it('can be overriden', () => {
        const handler1 = sinon.spy();
        const handler2 = sinon.spy();
        const handler3 = sinon.spy();

        const topicDefault = 'topic default';
        const sub2Default = 'sub 2 default';
        const sub3Default = 'sub 3 default';

        const someValue = 'some value';

        pubst.addTopic({
          name: TEST_TOPIC_1,
          default: topicDefault,
          doPrime: false
        });

        pubst.subscribe(TEST_TOPIC_1, handler1);
        pubst.subscribe(TEST_TOPIC_1, handler2, sub2Default);
        pubst.subscribe(TEST_TOPIC_1, {
          handler: handler3,
          default: sub3Default
        });

        pubst.publish(TEST_TOPIC_1, someValue);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(someValue, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(someValue, TEST_TOPIC_1);
        expect(handler3).to.have.been.calledWith(someValue, TEST_TOPIC_1);

        handler1.resetHistory();
        handler2.resetHistory();
        handler3.resetHistory();

        pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(topicDefault, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(sub2Default, TEST_TOPIC_1);
        expect(handler3).to.have.been.calledWith(sub3Default, TEST_TOPIC_1);
      });
    });

    describe('eventOnly', () => {
      it('creates topics that do not publish a payload', () => {
        const handler = sinon.spy();

        pubst.addTopic({
          name: TEST_TOPIC_1,
          eventOnly: true,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(TEST_TOPIC_1);

        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1, 'some ignored payload');

        clock.tick(1);
        expect(handler).to.have.been.calledWith(TEST_TOPIC_1);
        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1);
        pubst.publish(TEST_TOPIC_1);
        pubst.publish(TEST_TOPIC_1);

        clock.tick(1);
        expect(handler).to.have.been.calledThrice;
      });

      it('is off by default', () => {
        const payload = 'a payload';
        const handler = sinon.spy();

        pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: false
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        pubst.publish(TEST_TOPIC_1, payload);

        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(payload);

        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1, payload);

        clock.tick(1);

        expect(handler).not.to.have.been.called;
      });
    });

    describe('doPrime', () => {
      it('sends current value to new subscribers when on', () => {
        pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            doPrime: true
          },
          {
            name: TEST_TOPIC_2,
            doPrime: false
          }
        ]);

        const testPayload = 'some test payload';

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);

        const handler1 = sinon.spy();
        const handler2 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);
        pubst.subscribe(TEST_TOPIC_2, handler2);

        clock.tick(1);

        expect(handler1).to.have.been.calledOnce;
        expect(handler1).to.have.been.calledWith(testPayload);

        expect(handler2).not.to.have.been.called;
      });

      it('can be overriden', () => {
        pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            doPrime: true
          },
          {
            name: TEST_TOPIC_2,
            doPrime: false
          }
        ]);

        const testPayload = 'some test payload';

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);

        const handler1 = sinon.spy();
        const handler2 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, {
          doPrime: false,
          handler: handler1
        });
        pubst.subscribe(TEST_TOPIC_2, {
          doPrime: true,
          handler: handler2
        });

        clock.tick(1);

        expect(handler1).not.to.have.been.called;

        expect(handler2).to.have.been.calledOnce;
        expect(handler2).to.have.been.calledWith(testPayload);
      });

      it('is on by default', () => {
        pubst.addTopics([
          {
            name: TEST_TOPIC_1
          }
        ]);

        const testPayload = 'some test payload';

        pubst.publish(TEST_TOPIC_1, testPayload);

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(testPayload);
      });

      it('sends default value if no other value is available', () => {
        const defaultPayload = 'some test payload';

        pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            doPrime: true,
            default: defaultPayload
          }
        ]);
        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(defaultPayload);
      });
    });

    describe('allowRepeats', () => {
      it('calls subs when the value does not change', () => {
        pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            allowRepeats: true
          },
          {
            name: TEST_TOPIC_2,
            allowRepeats: false
          }
        ]);

        const testPayload = 'some test payload';

        const handler1 = sinon.spy();
        const handler2 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);
        pubst.subscribe(TEST_TOPIC_2, handler2);

        clock.tick(1);

        expect(handler1).not.to.have.been.called;
        expect(handler2).not.to.have.been.called;

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_2);

        handler1.resetHistory();
        handler2.resetHistory();

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(handler2).not.to.have.been.called;
      });

      it('is off by default', () => {
        pubst.addTopic({
          name: TEST_TOPIC_1
        });

        const testPayload = 'some test payload';

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith(testPayload, TEST_TOPIC_1);

        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1, 'something else');

        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith('something else', TEST_TOPIC_1);

        handler.resetHistory();

        pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);
        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);

        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith(testPayload, TEST_TOPIC_1);
      });

      it('can be overriden', () => {
        pubst.addTopic({
          name: TEST_TOPIC_1,
          allowRepeats: false
        });

        const testPayload = 'some test payload';

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, {
          allowRepeats: true,
          handler
        });

        pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        expect(handler).to.have.been.calledThrice;
        expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      });
    });

    describe('validator', () => {
      it('allows all values by default', () => {
        pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            doPrime: false
          }
        ]);

        const handler1 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);

        pubst.publish(TEST_TOPIC_1, 'Hello');
        pubst.publish(TEST_TOPIC_1, 12);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith('Hello', TEST_TOPIC_1);
        expect(handler1).to.have.been.calledWith(12, TEST_TOPIC_1);
      });

      it('fails when valid is false', () => {
        pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: false,
          validator: () => ({valid: false, messages: ['message 1', 'message 2']})
        });

        const handler1 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);

        try {
          pubst.publish(TEST_TOPIC_1, 'Hello');
          throw new Error('This publish should have thrown');
        } catch (e) {
          const {message} = e;
          expect(message).to.contain('message 1');
          expect(message).to.contain('message 2');
          expect(message).to.contain(TEST_TOPIC_1);
          expect(message).to.contain('Hello');
        }

        clock.tick(1);

        expect(handler1).not.to.have.been.called;
      });

      it('fails when result is falsey', () => {
        pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: false,
          validator: () => false
        });

        const handler1 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);

        try {
          pubst.publish(TEST_TOPIC_1, 'Hello');
          throw new Error('This publish should have thrown');
        } catch (e) {
          const {message} = e;
          expect(message).to.contain(TEST_TOPIC_1);
          expect(message).to.contain('Hello');
        }

        clock.tick(1);

        expect(handler1).not.to.have.been.called;
      });

      it('allows payloads when valid is true', () => {
        pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: false,
          validator: () => ({valid: true})
        });

        const handler1 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);

        pubst.publish(TEST_TOPIC_1, 'Hello');

        clock.tick(1);

        expect(handler1).to.have.been.calledOnceWith('Hello', TEST_TOPIC_1);
      });
    });
  });

  describe('publish & subscribe', () => {
    it('calls the subscriber if the topic already has a set value', () => {
      const testPayload = 'some test payload';
      const handler = sinon.spy();

      pubst.publish(TEST_TOPIC_1, testPayload);

      pubst.subscribe(TEST_TOPIC_1, handler);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('does not call the subscriber if the topic already has a set value when doPrime is false', () => {
      const testPayload = 'some test payload';
      const handler = sinon.spy();

      pubst.publish(TEST_TOPIC_1, testPayload);

      pubst.subscribe(TEST_TOPIC_1, {
        doPrime: false,
        handler
      });

      clock.tick(1);

      expect(handler).to.have.callCount(0);

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has not been set', () => {
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('does not call subscribers when the same value is published multiple times', () => {
      const testPayload = 'test payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler);
      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).not.to.have.been.called;
    });

    it('allows subscriptions to permit values to repeat', () => {
      const testPayload = 'test payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, {
        allowRepeats: true,
        handler
      });
      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has been set with null', () => {
      const testPayload = 'test payload';
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      pubst.publish(TEST_TOPIC_1, null);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('allows subscriptions to be made with config objects', () => {
      const testPayload = 'test payload';
      const defaultPayload = 'default payload';
      const handler1 = sinon.spy();
      const handler2 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, {
        handler: handler1,
        default: defaultPayload
      });

      pubst.subscribe(TEST_TOPIC_1, handler2, defaultPayload);

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler1.resetHistory();
      handler2.resetHistory();

      pubst.publish(TEST_TOPIC_1, null);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('calls all the subscribers for a topic', () => {
      const testPayload = 'test payload';

      const topic1Handler1 = sinon.spy();
      const topic1Handler2 = sinon.spy();
      const topic2Handler1 = sinon.spy();
      const topic2Handler2 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, topic1Handler1);
      pubst.subscribe(TEST_TOPIC_1, topic1Handler2);
      pubst.subscribe(TEST_TOPIC_2, topic2Handler1);
      pubst.subscribe(TEST_TOPIC_2, topic2Handler2);

      pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(topic1Handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      expect(topic1Handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_1);

      expect(topic2Handler1).not.to.have.been.called;
      expect(topic2Handler2).not.to.have.been.called;

      topic1Handler1.resetHistory();
      topic1Handler2.resetHistory();
      topic2Handler1.resetHistory();
      topic2Handler2.resetHistory();

      pubst.publish(TEST_TOPIC_2, testPayload);

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

      const unsub1 = pubst.subscribe(TEST_TOPIC_1, handler1);
      const unsub2 = pubst.subscribe(TEST_TOPIC_1, handler2);

      pubst.publish(TEST_TOPIC_1, testPayload1);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

      handler1.resetHistory();
      handler2.resetHistory();

      unsub1();

      pubst.publish(TEST_TOPIC_1, testPayload2);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).to.have.been.calledWith(testPayload2, TEST_TOPIC_1);

      handler1.resetHistory();
      handler2.resetHistory();

      unsub2();

      pubst.publish(TEST_TOPIC_1, testPayload3);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).not.to.have.been.called;
    });

    it('sends null if no default was provided and a null was published', () => {
      const originalPayload = 'the original payload';
      const handler = sinon.spy();

      pubst.publish(TEST_TOPIC_1, originalPayload);
      clock.tick(1);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(originalPayload);

      pubst.subscribe(TEST_TOPIC_1, handler);
      clock.tick(1);

      expect(handler).to.have.been.calledWith(originalPayload, TEST_TOPIC_1);
      handler.resetHistory();

      pubst.publish(TEST_TOPIC_1, null);
      clock.tick(1);

      expect(handler).to.have.been.calledWith(null, TEST_TOPIC_1);
    });

    it('maintains the payload for each scheduled call when changed before the call is made', () => {
      const payloads = [1, 2, 3, 4, 5];

      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler);

      payloads.forEach(payload => {
        pubst.publish(TEST_TOPIC_1, payload);
      });

      clock.tick(1);

      expect(handler).to.have.callCount(payloads.length);
      payloads.forEach(payload => {
        expect(handler).to.have.been.calledWith(payload, TEST_TOPIC_1);
      });
    });

    describe('regex subscribers', () => {

      it('allows a subscriber to use a regex for a topic name', () => {
        const specificHandler = sinon.spy();
        const allTestTopicHandler = sinon.spy();
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload1 = 'one';
        const testPayload2 = 'two';
        const testPayload3 = 'something else';

        pubst.subscribe(/test\.topic\.one/, specificHandler);
        pubst.subscribe(/test\.topic\..*/, allTestTopicHandler);
        pubst.subscribe(/.*/, anythingHandler);

        pubst.publish(TEST_TOPIC_1, testPayload1);
        pubst.publish(TEST_TOPIC_2, testPayload2);
        pubst.publish(otherTopic, testPayload3);

        clock.tick(1);

        expect(specificHandler).to.have.callCount(1);
        expect(allTestTopicHandler).to.have.callCount(2);
        expect(anythingHandler).to.have.callCount(3);

        expect(specificHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

        expect(allTestTopicHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(allTestTopicHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);

        expect(anythingHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload3, otherTopic);
      });

      it('are primed with ALL existing topics that match', () => {
        const specificHandler = sinon.spy();
        const allTestTopicHandler = sinon.spy();
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload1 = 'one';
        const testPayload2 = 'two';
        const testPayload3 = 'something else';

        pubst.publish(TEST_TOPIC_1, testPayload1);
        pubst.publish(TEST_TOPIC_2, testPayload2);
        pubst.publish(otherTopic, testPayload3);

        clock.tick(1);

        pubst.subscribe(/test\.topic\.one/, specificHandler);
        pubst.subscribe(/test\.topic\..*/, allTestTopicHandler);
        pubst.subscribe(/.*/, anythingHandler);

        clock.tick(1);

        expect(specificHandler).to.have.callCount(1);
        expect(allTestTopicHandler).to.have.callCount(2);
        expect(anythingHandler).to.have.callCount(3);

        expect(specificHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

        expect(allTestTopicHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(allTestTopicHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);

        expect(anythingHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload3, otherTopic);
      });

      it('can live side by side with string handlers', () => {
        const specificHandler = sinon.spy();
        const allTestTopicHandler = sinon.spy();
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload1 = 'one';
        const testPayload2 = 'two';
        const testPayload3 = 'something else';

        pubst.publish(TEST_TOPIC_1, testPayload1);
        pubst.publish(TEST_TOPIC_2, testPayload2);
        pubst.publish(otherTopic, testPayload3);

        clock.tick(1);

        pubst.subscribe(TEST_TOPIC_1, specificHandler);
        pubst.subscribe(/test\.topic\..*/, allTestTopicHandler);
        pubst.subscribe(/.*/, anythingHandler);

        clock.tick(1);

        expect(specificHandler).to.have.callCount(1);
        expect(allTestTopicHandler).to.have.callCount(2);
        expect(anythingHandler).to.have.callCount(3);

        expect(specificHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

        expect(allTestTopicHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(allTestTopicHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);

        expect(anythingHandler).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload2, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload3, otherTopic);
      });

      it('can unsubscribe', () => {
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload = 'something else';

        const unsub = pubst.subscribe(/.*/, anythingHandler);

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);
        pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload, otherTopic);

        anythingHandler.resetHistory();

        unsub();

        pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).not.to.have.been.called;
      });

      it('receive the same default for all topics', () => {
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload = 'something else';
        const testDefault = 'some default';

        pubst.subscribe(/.*/, anythingHandler, testDefault);

        clock.tick(1);

        expect(anythingHandler).not.to.have.been.called;

        pubst.publish(TEST_TOPIC_1, testPayload);
        pubst.publish(TEST_TOPIC_2, testPayload);
        pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload, otherTopic);

        anythingHandler.resetHistory();

        pubst.publish(TEST_TOPIC_1);
        pubst.publish(TEST_TOPIC_2);
        pubst.publish(otherTopic);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testDefault, otherTopic);

        anythingHandler.resetHistory();

        const newOtherTopic = 'another.new.topic';

        pubst.publish(newOtherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, newOtherTopic);

        anythingHandler.resetHistory();

        pubst.clearAll();

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(4);
        expect(anythingHandler).to.have.been.calledWith(testDefault, newOtherTopic);
        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testDefault, otherTopic);

      });
    });

  });

  describe('clear', () => {
    it('clears a topic', () => {
      const testValue = 'some value';
      const testDefault = 'some default';

      pubst.publish(TEST_TOPIC_1, testValue);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(testValue);

      pubst.clear(TEST_TOPIC_1);

      expect(pubst.currentVal(TEST_TOPIC_1)).to.equal(null);
      expect(pubst.currentVal(TEST_TOPIC_1, testDefault)).to.equal(testDefault);
    });

    it('calls subscribers with null when the topic is cleared and there is no default', () => {
      const testValue = 'some value';

      pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue);
      sub.resetHistory();

      pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(null, TEST_TOPIC_1);
    });

    it('calls subscribers with their default when the topic is cleared', () => {
      const testValue = 'some value';
      const testDefault = 'some default';

      pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub, testDefault);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue);
      sub.resetHistory();

      pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(testDefault, TEST_TOPIC_1);
    });

    it('does not call subscribers on topics that were never published', () => {

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).not.to.have.been.called;
    });

    it('does not call subscribers on topics that are already cleared', () => {
      const testValue = 'some value';

      pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue, TEST_TOPIC_1);
      sub.resetHistory();

      pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(null, TEST_TOPIC_1);
      sub.resetHistory();

      pubst.clear(TEST_TOPIC_1);

      clock.tick(1);
      expect(sub).not.to.have.been.called;
    });
  });

  describe('clearAll', () => {
    it('clears all topics that have been published to', () => {
      const testVal1 = 'value 1';
      const testVal2 = 'value 2';

      const TEST_TOPIC_3 = 'test.topic.three';

      const sub1 = sinon.spy();
      const sub2 = sinon.spy();
      const sub3 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub1);
      pubst.subscribe(TEST_TOPIC_2, sub2);
      pubst.subscribe(TEST_TOPIC_3, sub3);

      pubst.publish(TEST_TOPIC_1, testVal1);
      pubst.publish(TEST_TOPIC_2, testVal2);

      clock.tick(1);

      expect(sub1).to.have.been.calledWith(testVal1, TEST_TOPIC_1);
      expect(sub2).to.have.been.calledWith(testVal2, TEST_TOPIC_2);
      expect(sub3).not.to.have.been.called;

      sub1.resetHistory();
      sub2.resetHistory();

      pubst.clearAll();

      clock.tick(1);

      expect(sub1).to.have.been.calledWith(null, TEST_TOPIC_1);
      expect(sub2).to.have.been.calledWith(null, TEST_TOPIC_2);
      expect(sub3).not.to.have.been.called;
    });
  });
});
