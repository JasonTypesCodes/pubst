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
import InMemoryStore from './InMemoryStore.js';

const expect = chai.expect;

describe('InMemoryStore', () => {
  let store;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  describe('registerTopic', () => {
    it('stores the initial value for the topic', async () => {
      await store.registerTopic('my.topic', 'initial');

      const val = await store.getValue('my.topic');
      expect(val).to.equal('initial');
    });

    it('defaults initialVal to null', async () => {
      await store.registerTopic('my.topic');

      const val = await store.getValue('my.topic');
      expect(val).to.equal(null);
    });

    it('returns an object with topicName, initialVal, and storeConfig', async () => {
      const storeConfig = { persistence: true };
      const result = await store.registerTopic('my.topic', 'initial', storeConfig);

      expect(result).to.deep.equal({
        topicName: 'my.topic',
        initialVal: 'initial',
        storeConfig: storeConfig
      });
    });

    it('defaults storeConfig to an empty object', async () => {
      const result = await store.registerTopic('my.topic', 'initial');

      expect(result).to.deep.equal({
        topicName: 'my.topic',
        initialVal: 'initial',
        storeConfig: {}
      });
    });
  });

  describe('getValue', () => {
    it('returns the stored value for a registered topic', async () => {
      await store.registerTopic('my.topic', 'hello');

      const val = await store.getValue('my.topic');
      expect(val).to.equal('hello');
    });

    it('returns undefined for an unregistered topic', async () => {
      const val = await store.getValue('unknown.topic');
      expect(val).to.be.undefined;
    });

    it('returns the most recently set value', async () => {
      await store.registerTopic('my.topic', 'first');
      await store.setValue('my.topic', 'second');

      const val = await store.getValue('my.topic');
      expect(val).to.equal('second');
    });
  });

  describe('setValue', () => {
    it('stores and returns the new value', async () => {
      await store.registerTopic('my.topic', 'initial');

      const result = await store.setValue('my.topic', 'updated');
      expect(result).to.equal('updated');

      const val = await store.getValue('my.topic');
      expect(val).to.equal('updated');
    });

    it('defaults to null when no value is provided', async () => {
      await store.registerTopic('my.topic', 'initial');

      const result = await store.setValue('my.topic');
      expect(result).to.equal(null);

      const val = await store.getValue('my.topic');
      expect(val).to.equal(null);
    });
  });

  describe('clearValue', () => {
    it('sets the value to null and returns null', async () => {
      await store.registerTopic('my.topic', 'initial');
      await store.setValue('my.topic', 'some value');

      const result = await store.clearValue('my.topic');
      expect(result).to.equal(null);

      const val = await store.getValue('my.topic');
      expect(val).to.equal(null);
    });
  });

  describe('getTopicNames', () => {
    it('returns an empty array when no topics are registered', async () => {
      const names = await store.getTopicNames();
      expect(names).to.deep.equal([]);
    });

    it('returns the names of all registered topics', async () => {
      await store.registerTopic('topic.one', 'val1');
      await store.registerTopic('topic.two', 'val2');
      await store.registerTopic('topic.three', 'val3');

      const names = await store.getTopicNames();
      expect(names).to.have.members(['topic.one', 'topic.two', 'topic.three']);
      expect(names).to.have.lengthOf(3);
    });

    it('includes topics that were set directly via setValue', async () => {
      await store.setValue('direct.topic', 'value');

      const names = await store.getTopicNames();
      expect(names).to.include('direct.topic');
    });
  });
});
