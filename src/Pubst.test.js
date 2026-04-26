/*
 *  Copyright 2017-2026 Jason Schindler
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import * as chai from 'chai';
import Pubst from './Pubst.js';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
chai.use(sinonChai);

const expect = chai.expect;

// Helper to flush promise microtasks so that subscribe's async
// priming (via store.getValue().then()) resolves before we tick
// the fake clock to fire setTimeout callbacks.
// We chain multiple Promise.resolve() calls to drain several
// levels of microtask depth (e.g. getTopicNames().then -> getValue().then -> scheduleCall).
const flushPromises = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => Promise.resolve());

describe('Pubst', () => {
  let pubst;
  const TEST_TOPIC_1 = 'test.topic.one';
  const TEST_TOPIC_2 = 'test.topic.two';

  let clock;

  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    pubst = new Pubst();
    await pubst.configure({showWarnings: false});
  });

  afterEach(() => {
    clock.restore();
  });

  describe('showWarnings', () => {
    let warnSpy;

    afterEach(() => {
      if (warnSpy) {
        warnSpy.restore();
        warnSpy = null;
      }
    });

    it('suppresses warnings when showWarnings is false', async () => {
      warnSpy = sinon.spy(console, 'warn');
      const p = new Pubst();
      await p.configure({showWarnings: false});

      await p.publish('unconfigured.topic', 'value');

      clock.tick(1);

      expect(warnSpy).not.to.have.been.called;
    });

    it('shows warnings by default', async () => {
      warnSpy = sinon.spy(console, 'warn');
      const p = new Pubst();

      await p.publish('unconfigured.topic', 'value');

      clock.tick(1);

      expect(warnSpy).to.have.been.called;
    });

    it('uses explicit logger over showWarnings', async () => {
      warnSpy = sinon.spy(console, 'warn');
      const customLogger = { warn: sinon.spy() };
      const p = new Pubst();
      await p.configure({logger: customLogger, showWarnings: false});

      await p.publish('unconfigured.topic', 'value');

      clock.tick(1);

      expect(customLogger.warn).to.have.been.called;
      expect(warnSpy).not.to.have.been.called;
    });

    it('shows warnings when showWarnings is true', async () => {
      warnSpy = sinon.spy(console, 'warn');
      const p = new Pubst();
      await p.configure({showWarnings: true});

      await p.publish('unconfigured.topic', 'value');

      clock.tick(1);

      expect(warnSpy).to.have.been.called;
    });
  });

  describe('custom store', () => {
    function createStubStore() {
      const store = {};
      return {
        registerTopic: sinon.spy(async (topicName, initialVal = null, storeConfig = {}) => {
          store[topicName] = initialVal;
          return {topicName, initialVal, storeConfig};
        }),
        getValue: sinon.spy(async (topicName) => {
          return store[topicName];
        }),
        setValue: sinon.spy(async (topicName, value = null) => {
          store[topicName] = value;
          return value;
        }),
        clearValue: sinon.spy(async (topicName) => {
          store[topicName] = null;
          return null;
        }),
        getTopicNames: sinon.spy(async () => {
          return Object.keys(store);
        }),
        _store: store
      };
    }

    it('uses a custom store when provided via configure', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      await p.publish('my.topic', 'value');

      expect(customStore.setValue).to.have.been.calledWith('my.topic', 'value');
    });

    it('calls registerTopic when addTopic is called', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      await p.addTopic({name: 'my.topic', default: 'default-val'});

      expect(customStore.registerTopic).to.have.been.calledOnce;
      expect(customStore.registerTopic).to.have.been.calledWith('my.topic', null, {});
    });

    it('passes storeConfig through to registerTopic', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      const storeConfig = { persistenceKey: 'my-key', ttl: 3600 };
      await p.addTopic({name: 'my.topic', default: 'val', storeConfig});

      expect(customStore.registerTopic).to.have.been.calledWith('my.topic', null, storeConfig);
    });

    it('calls getValue when currentVal is called', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      await p.publish('my.topic', 'hello');
      customStore.getValue.resetHistory();

      const val = await p.currentVal('my.topic');

      expect(customStore.getValue).to.have.been.calledWith('my.topic');
      expect(val).to.equal('hello');
    });

    it('calls setValue when publish is called', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      await p.publish('my.topic', 'payload');

      expect(customStore.setValue).to.have.been.calledWith('my.topic', 'payload');
    });

    it('calls getTopicNames and publishes null when clearAll is called', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({showWarnings: false, store: customStore});

      await p.publish('topic.one', 'val1');
      await p.publish('topic.two', 'val2');

      customStore.getTopicNames.resetHistory();
      customStore.setValue.resetHistory();

      await p.clearAll();

      expect(customStore.getTopicNames).to.have.been.called;
      // clearAll calls clear for each topic, which calls publish(topic, null)
      expect(customStore.setValue).to.have.been.calledWith('topic.one', null);
      expect(customStore.setValue).to.have.been.calledWith('topic.two', null);
    });

    it('registers topics passed via configure', async () => {
      const customStore = createStubStore();
      const p = new Pubst();
      await p.configure({
        showWarnings: false,
        store: customStore,
        topics: [
          {name: 'topic.a', default: 'a-default'},
          {name: 'topic.b', default: 'b-default', storeConfig: {key: 'b'}}
        ]
      });

      expect(customStore.registerTopic).to.have.been.calledTwice;
      expect(customStore.registerTopic).to.have.been.calledWith('topic.a', null, {});
      expect(customStore.registerTopic).to.have.been.calledWith('topic.b', null, {key: 'b'});
    });
  });

  describe('currentVal', () => {
    it('returns the current value', async () => {
      const testValue = 'some value';

      await pubst.publish(TEST_TOPIC_1, testValue);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(testValue);
    });

    it('returns the current value with a default', async () => {
      const testValue = 'some value';
      const myDefault = 'some default';

      await pubst.publish(TEST_TOPIC_1, testValue);

      expect(await pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(testValue);
    });

    it('returns the default value if current was never set', async () => {
      const myDefault = 'some default';

      expect(await pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns the default value if current was set to null', async () => {
      const myDefault = 'some default';

      await pubst.publish(TEST_TOPIC_1, null);

      expect(await pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });

    it('returns undefined if value was not set and no default is provided', async () => {
      expect(await pubst.currentVal(TEST_TOPIC_1)).to.be.an('undefined');
    });

    it('returns null if value was set to null and no default is provided', async () => {
      await pubst.publish(TEST_TOPIC_1, null);
      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(null);
    });

    it('returns null if value was not set and a default of null is provided', async () => {
      expect(await pubst.currentVal(TEST_TOPIC_1, null)).to.equal(null);
    });

    it('returns topic default if value was not set and no default is provided', async () => {
      const myDefault = 'some default';

      await pubst.addTopic({
        name: TEST_TOPIC_1,
        default: myDefault
      });

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(myDefault);
    });

    it('returns provided default if value was not set and topic was configured with a default', async () => {
      const myDefault = 'some default';
      const topicDefault = 'topic default';

      await pubst.addTopic({
        name: TEST_TOPIC_1,
        default: topicDefault
      });

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(topicDefault);
      expect(await pubst.currentVal(TEST_TOPIC_1, myDefault)).to.equal(myDefault);
    });
  });

  describe('publish', () => {
    it('sets a payload for a topic', async () => {
      const payload1 = 'payload1';
      const payload2 = 'payload2';

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.be.an('undefined');

      await pubst.publish(TEST_TOPIC_1, payload1);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(payload1);

      await pubst.publish(TEST_TOPIC_1, payload2);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(payload2);
    });
  });

  describe('topic config', () => {
    describe('name', () => {
      it('is required', async () => {
        let errorThrown = false;

        try {
          await pubst.addTopic({});
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          errorThrown = true;
        }

        expect(errorThrown).to.be.true;
      });
    });

    describe('default', () => {
      it('is configurable', async () => {
        const handler = sinon.spy();
        const defaultVal = 'DEFAULT VALUE';

        await pubst.addTopic({
          name: TEST_TOPIC_1,
          default: defaultVal,
          doPrime: false
        });

        await pubst.publish(TEST_TOPIC_1, 'SOME VALUE');

        pubst.subscribe(TEST_TOPIC_1, handler);

        await pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);
      });

      it('is off by default', async () => {
        const handler = sinon.spy();

        await pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        await flushPromises();
        clock.tick(1);

        expect(handler).not.to.have.been.called;
      });

      it('is sent again after a clear', async () => {
        const handler = sinon.spy();
        const defaultVal = 'SOME DEFAULT';
        const aValue = 'A real value';

        await pubst.addTopic({
          name: TEST_TOPIC_1,
          default: defaultVal,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        await flushPromises();
        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);

        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1, aValue);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(aValue, TEST_TOPIC_1);

        handler.resetHistory();

        await pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler).to.have.been.calledWith(defaultVal, TEST_TOPIC_1);
      });

      it('can be overriden', async () => {
        const handler1 = sinon.spy();
        const handler2 = sinon.spy();
        const handler3 = sinon.spy();

        const topicDefault = 'topic default';
        const sub2Default = 'sub 2 default';
        const sub3Default = 'sub 3 default';

        const someValue = 'some value';

        await pubst.addTopic({
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

        await pubst.publish(TEST_TOPIC_1, someValue);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(someValue, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(someValue, TEST_TOPIC_1);
        expect(handler3).to.have.been.calledWith(someValue, TEST_TOPIC_1);

        handler1.resetHistory();
        handler2.resetHistory();
        handler3.resetHistory();

        await pubst.clear(TEST_TOPIC_1);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(topicDefault, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(sub2Default, TEST_TOPIC_1);
        expect(handler3).to.have.been.calledWith(sub3Default, TEST_TOPIC_1);
      });
    });

    describe('eventOnly', () => {
      it('creates topics that do not publish a payload', async () => {
        const handler = sinon.spy();

        await pubst.addTopic({
          name: TEST_TOPIC_1,
          eventOnly: true,
          doPrime: true
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        await flushPromises();
        clock.tick(1);

        expect(handler).to.have.been.calledWith(TEST_TOPIC_1);

        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1, 'some ignored payload');

        clock.tick(1);
        expect(handler).to.have.been.calledWith(TEST_TOPIC_1);
        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1);
        await pubst.publish(TEST_TOPIC_1);
        await pubst.publish(TEST_TOPIC_1);

        clock.tick(1);
        expect(handler).to.have.been.calledThrice;
      });

      it('is off by default', async () => {
        const payload = 'a payload';
        const handler = sinon.spy();

        await pubst.addTopic({
          name: TEST_TOPIC_1,
          doPrime: false
        });

        pubst.subscribe(TEST_TOPIC_1, handler);

        await pubst.publish(TEST_TOPIC_1, payload);

        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(payload);

        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1, payload);

        clock.tick(1);

        expect(handler).not.to.have.been.called;
      });
    });

    describe('doPrime', () => {
      it('sends current value to new subscribers when on', async () => {
        await pubst.addTopics([
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

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);

        const handler1 = sinon.spy();
        const handler2 = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler1);
        pubst.subscribe(TEST_TOPIC_2, handler2);

        await flushPromises();
        clock.tick(1);

        expect(handler1).to.have.been.calledOnce;
        expect(handler1).to.have.been.calledWith(testPayload);

        expect(handler2).not.to.have.been.called;
      });

      it('can be overriden', async () => {
        await pubst.addTopics([
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

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);

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

        await flushPromises();
        clock.tick(1);

        expect(handler1).not.to.have.been.called;

        expect(handler2).to.have.been.calledOnce;
        expect(handler2).to.have.been.calledWith(testPayload);
      });

      it('is on by default', async () => {
        await pubst.addTopics([
          {
            name: TEST_TOPIC_1
          }
        ]);

        const testPayload = 'some test payload';

        await pubst.publish(TEST_TOPIC_1, testPayload);

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        await flushPromises();
        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(testPayload);
      });

      it('sends default value if no other value is available', async () => {
        const defaultPayload = 'some test payload';

        await pubst.addTopics([
          {
            name: TEST_TOPIC_1,
            doPrime: true,
            default: defaultPayload
          }
        ]);
        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        await flushPromises();
        clock.tick(1);

        expect(handler).to.have.been.calledOnce;
        expect(handler).to.have.been.calledWith(defaultPayload);
      });
    });

    describe('allowRepeats', () => {
      it('calls subs when the value does not change', async () => {
        await pubst.addTopics([
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

        await flushPromises();
        clock.tick(1);

        expect(handler1).not.to.have.been.called;
        expect(handler2).not.to.have.been.called;

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_2);

        handler1.resetHistory();
        handler2.resetHistory();

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);

        clock.tick(1);

        expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(handler2).not.to.have.been.called;
      });

      it('is off by default', async () => {
        await pubst.addTopic({
          name: TEST_TOPIC_1
        });

        const testPayload = 'some test payload';

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, handler);

        await pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith(testPayload, TEST_TOPIC_1);

        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1, 'something else');

        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith('something else', TEST_TOPIC_1);

        handler.resetHistory();

        await pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);

        clock.tick(1);

        expect(handler).to.have.been.calledOnceWith(testPayload, TEST_TOPIC_1);
      });

      it('can be overriden', async () => {
        await pubst.addTopic({
          name: TEST_TOPIC_1,
          allowRepeats: false
        });

        const testPayload = 'some test payload';

        const handler = sinon.spy();

        pubst.subscribe(TEST_TOPIC_1, {
          allowRepeats: true,
          handler
        });

        await pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_1, testPayload);
        clock.tick(1);

        expect(handler).to.have.been.calledThrice;
        expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      });
    });
  });

  describe('publish & subscribe', () => {
    it('calls the subscriber if the topic already has a set value', async () => {
      const testPayload = 'some test payload';
      const handler = sinon.spy();

      await pubst.publish(TEST_TOPIC_1, testPayload);

      pubst.subscribe(TEST_TOPIC_1, handler);

      await flushPromises();
      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('does not call the subscriber if the topic already has a set value when doPrime is false', async () => {
      const testPayload = 'some test payload';
      const handler = sinon.spy();

      await pubst.publish(TEST_TOPIC_1, testPayload);

      pubst.subscribe(TEST_TOPIC_1, {
        doPrime: false,
        handler
      });

      await flushPromises();
      clock.tick(1);

      expect(handler).to.have.callCount(0);

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has not been set', async () => {
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      await flushPromises();
      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('does not call subscribers when the same value is published multiple times', async () => {
      const testPayload = 'test payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler);
      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).not.to.have.been.called;
    });

    it('allows subscriptions to permit values to repeat', async () => {
      const testPayload = 'test payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, {
        allowRepeats: true,
        handler
      });
      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
    });

    it('calls the subscriber with the default value if the topic has been set with null', async () => {
      const testPayload = 'test payload';
      const defaultPayload = 'default payload';
      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler, defaultPayload);

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler.resetHistory();

      await pubst.publish(TEST_TOPIC_1, null);

      clock.tick(1);

      expect(handler).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('allows subscriptions to be made with config objects', async () => {
      const testPayload = 'test payload';
      const defaultPayload = 'default payload';
      const handler1 = sinon.spy();
      const handler2 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, {
        handler: handler1,
        default: defaultPayload
      });

      pubst.subscribe(TEST_TOPIC_1, handler2, defaultPayload);

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      handler1.resetHistory();
      handler2.resetHistory();

      await pubst.publish(TEST_TOPIC_1, null);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(defaultPayload, TEST_TOPIC_1);
    });

    it('calls all the subscribers for a topic', async () => {
      const testPayload = 'test payload';

      const topic1Handler1 = sinon.spy();
      const topic1Handler2 = sinon.spy();
      const topic2Handler1 = sinon.spy();
      const topic2Handler2 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, topic1Handler1);
      pubst.subscribe(TEST_TOPIC_1, topic1Handler2);
      pubst.subscribe(TEST_TOPIC_2, topic2Handler1);
      pubst.subscribe(TEST_TOPIC_2, topic2Handler2);

      await pubst.publish(TEST_TOPIC_1, testPayload);

      clock.tick(1);

      expect(topic1Handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
      expect(topic1Handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_1);

      expect(topic2Handler1).not.to.have.been.called;
      expect(topic2Handler2).not.to.have.been.called;

      topic1Handler1.resetHistory();
      topic1Handler2.resetHistory();
      topic2Handler1.resetHistory();
      topic2Handler2.resetHistory();

      await pubst.publish(TEST_TOPIC_2, testPayload);

      clock.tick(1);

      expect(topic1Handler1).not.to.have.been.called;
      expect(topic1Handler2).not.to.have.been.called;

      expect(topic2Handler1).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
      expect(topic2Handler2).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
    });

    it('allows subscribers to unsunscribe', async () => {
      const testPayload1 = 'test payload 1';
      const testPayload2 = 'test payload 2';
      const testPayload3 = 'test payload 3';

      const handler1 = sinon.spy();
      const handler2 = sinon.spy();

      const unsub1 = pubst.subscribe(TEST_TOPIC_1, handler1);
      const unsub2 = pubst.subscribe(TEST_TOPIC_1, handler2);

      await pubst.publish(TEST_TOPIC_1, testPayload1);

      clock.tick(1);

      expect(handler1).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);
      expect(handler2).to.have.been.calledWith(testPayload1, TEST_TOPIC_1);

      handler1.resetHistory();
      handler2.resetHistory();

      unsub1();

      await pubst.publish(TEST_TOPIC_1, testPayload2);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).to.have.been.calledWith(testPayload2, TEST_TOPIC_1);

      handler1.resetHistory();
      handler2.resetHistory();

      unsub2();

      await pubst.publish(TEST_TOPIC_1, testPayload3);

      clock.tick(1);

      expect(handler1).not.to.have.been.called;
      expect(handler2).not.to.have.been.called;
    });

    it('sends null if no default was provided and a null was published', async () => {
      const originalPayload = 'the original payload';
      const handler = sinon.spy();

      await pubst.publish(TEST_TOPIC_1, originalPayload);

      await flushPromises();
      clock.tick(1);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(originalPayload);

      pubst.subscribe(TEST_TOPIC_1, handler);

      await flushPromises();
      clock.tick(1);

      expect(handler).to.have.been.calledWith(originalPayload, TEST_TOPIC_1);
      handler.resetHistory();

      await pubst.publish(TEST_TOPIC_1, null);
      clock.tick(1);

      expect(handler).to.have.been.calledWith(null, TEST_TOPIC_1);
    });

    it('maintains the payload for each scheduled call when changed before the call is made', async () => {
      const payloads = [1, 2, 3, 4, 5];

      const handler = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, handler);

      for (const payload of payloads) {
        await pubst.publish(TEST_TOPIC_1, payload);
      }

      clock.tick(1);

      expect(handler).to.have.callCount(payloads.length);
      payloads.forEach(payload => {
        expect(handler).to.have.been.calledWith(payload, TEST_TOPIC_1);
      });
    });

    describe('regex subscribers', () => {

      it('allows a subscriber to use a regex for a topic name', async () => {
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

        await pubst.publish(TEST_TOPIC_1, testPayload1);
        await pubst.publish(TEST_TOPIC_2, testPayload2);
        await pubst.publish(otherTopic, testPayload3);

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

      it('are primed with ALL existing topics that match', async () => {
        const specificHandler = sinon.spy();
        const allTestTopicHandler = sinon.spy();
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload1 = 'one';
        const testPayload2 = 'two';
        const testPayload3 = 'something else';

        await pubst.publish(TEST_TOPIC_1, testPayload1);
        await pubst.publish(TEST_TOPIC_2, testPayload2);
        await pubst.publish(otherTopic, testPayload3);

        await flushPromises();
        clock.tick(1);

        pubst.subscribe(/test\.topic\.one/, specificHandler);
        pubst.subscribe(/test\.topic\..*/, allTestTopicHandler);
        pubst.subscribe(/.*/, anythingHandler);

        await flushPromises();
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

      it('can live side by side with string handlers', async () => {
        const specificHandler = sinon.spy();
        const allTestTopicHandler = sinon.spy();
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload1 = 'one';
        const testPayload2 = 'two';
        const testPayload3 = 'something else';

        await pubst.publish(TEST_TOPIC_1, testPayload1);
        await pubst.publish(TEST_TOPIC_2, testPayload2);
        await pubst.publish(otherTopic, testPayload3);

        await flushPromises();
        clock.tick(1);

        pubst.subscribe(TEST_TOPIC_1, specificHandler);
        pubst.subscribe(/test\.topic\..*/, allTestTopicHandler);
        pubst.subscribe(/.*/, anythingHandler);

        await flushPromises();
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

      it('can unsubscribe', async () => {
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload = 'something else';

        const unsub = pubst.subscribe(/.*/, anythingHandler);

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);
        await pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload, otherTopic);

        anythingHandler.resetHistory();

        unsub();

        await pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).not.to.have.been.called;
      });

      it('receive the same default for all topics', async () => {
        const anythingHandler = sinon.spy();

        const otherTopic = 'ANOTHER_TOPIC!';

        const testPayload = 'something else';
        const testDefault = 'some default';

        pubst.subscribe(/.*/, anythingHandler, testDefault);

        await flushPromises();
        clock.tick(1);

        expect(anythingHandler).not.to.have.been.called;

        await pubst.publish(TEST_TOPIC_1, testPayload);
        await pubst.publish(TEST_TOPIC_2, testPayload);
        await pubst.publish(otherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testPayload, otherTopic);

        anythingHandler.resetHistory();

        await pubst.publish(TEST_TOPIC_1);
        await pubst.publish(TEST_TOPIC_2);
        await pubst.publish(otherTopic);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(3);

        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_1);
        expect(anythingHandler).to.have.been.calledWith(testDefault, TEST_TOPIC_2);
        expect(anythingHandler).to.have.been.calledWith(testDefault, otherTopic);

        anythingHandler.resetHistory();

        const newOtherTopic = 'another.new.topic';

        await pubst.publish(newOtherTopic, testPayload);

        clock.tick(1);

        expect(anythingHandler).to.have.callCount(1);
        expect(anythingHandler).to.have.been.calledWith(testPayload, newOtherTopic);

        anythingHandler.resetHistory();

        await pubst.clearAll();

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
    it('clears a topic', async () => {
      const testValue = 'some value';
      const testDefault = 'some default';

      await pubst.publish(TEST_TOPIC_1, testValue);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(testValue);

      await pubst.clear(TEST_TOPIC_1);

      expect(await pubst.currentVal(TEST_TOPIC_1)).to.equal(null);
      expect(await pubst.currentVal(TEST_TOPIC_1, testDefault)).to.equal(testDefault);
    });

    it('calls subscribers with null when the topic is cleared and there is no default', async () => {
      const testValue = 'some value';

      await pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      await flushPromises();
      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue);
      sub.resetHistory();

      await pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(null, TEST_TOPIC_1);
    });

    it('calls subscribers with their default when the topic is cleared', async () => {
      const testValue = 'some value';
      const testDefault = 'some default';

      await pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub, testDefault);

      await flushPromises();
      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue);
      sub.resetHistory();

      await pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(testDefault, TEST_TOPIC_1);
    });

    it('does not call subscribers on topics that were never published', async () => {

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      await pubst.clear(TEST_TOPIC_1);

      await flushPromises();
      clock.tick(1);

      expect(sub).not.to.have.been.called;
    });

    it('does not call subscribers on topics that are already cleared', async () => {
      const testValue = 'some value';

      await pubst.publish(TEST_TOPIC_1, testValue);

      const sub = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub);

      await flushPromises();
      clock.tick(1);

      expect(sub).to.have.been.calledWith(testValue, TEST_TOPIC_1);
      sub.resetHistory();

      await pubst.clear(TEST_TOPIC_1);

      clock.tick(1);

      expect(sub).to.have.been.calledWith(null, TEST_TOPIC_1);
      sub.resetHistory();

      await pubst.clear(TEST_TOPIC_1);

      clock.tick(1);
      expect(sub).not.to.have.been.called;
    });
  });

  describe('clearAll', () => {
    it('clears all topics that have been published to', async () => {
      const testVal1 = 'value 1';
      const testVal2 = 'value 2';

      const TEST_TOPIC_3 = 'test.topic.three';

      const sub1 = sinon.spy();
      const sub2 = sinon.spy();
      const sub3 = sinon.spy();

      pubst.subscribe(TEST_TOPIC_1, sub1);
      pubst.subscribe(TEST_TOPIC_2, sub2);
      pubst.subscribe(TEST_TOPIC_3, sub3);

      await pubst.publish(TEST_TOPIC_1, testVal1);
      await pubst.publish(TEST_TOPIC_2, testVal2);

      clock.tick(1);

      expect(sub1).to.have.been.calledWith(testVal1, TEST_TOPIC_1);
      expect(sub2).to.have.been.calledWith(testVal2, TEST_TOPIC_2);
      expect(sub3).not.to.have.been.called;

      sub1.resetHistory();
      sub2.resetHistory();

      await pubst.clearAll();

      clock.tick(1);

      expect(sub1).to.have.been.calledWith(null, TEST_TOPIC_1);
      expect(sub2).to.have.been.calledWith(null, TEST_TOPIC_2);
      expect(sub3).not.to.have.been.called;
    });
  });
});
