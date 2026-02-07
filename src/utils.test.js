import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as utils from './utils.js';

chai.use(sinonChai);

const expect = chai.expect;

describe('Pubst Utils', () =>{

  describe('isUndefined', () => {

    it('true when undefined', () => {
      expect(utils.isUndefined()).to.be.true;
      expect(utils.isUndefined(undefined)).to.be.true;
    });

    it('false when defined', () => {
      expect(utils.isUndefined('')).to.be.false;
      expect(utils.isUndefined(0)).to.be.false;
      expect(utils.isUndefined(true)).to.be.false;
      expect(utils.isUndefined({})).to.be.false;
      expect(utils.isUndefined([])).to.be.false;
      expect(utils.isUndefined(null)).to.be.false;
    });
  });

  describe('isDefined', () => {

    it('false when not defined', () => {
      expect(utils.isDefined()).to.be.false;
      expect(utils.isDefined(undefined)).to.be.false;
    });

    it('true when defined', () => {
      expect(utils.isDefined('')).to.be.true;
      expect(utils.isDefined(0)).to.be.true;
      expect(utils.isDefined(true)).to.be.true;
      expect(utils.isDefined({})).to.be.true;
      expect(utils.isDefined([])).to.be.true;
      expect(utils.isDefined(null)).to.be.true;
    });
  });

  describe('isSet', () => {

    it('true when not null or undefined', () => {
      expect(utils.isSet('')).to.be.true;
      expect(utils.isSet(0)).to.be.true;
      expect(utils.isSet(true)).to.be.true;
      expect(utils.isSet({})).to.be.true;
      expect(utils.isSet([])).to.be.true;
    });

    it('false when null or undefined', () => {
      expect(utils.isSet(null)).to.be.false;
      expect(utils.isSet()).to.be.false;
      expect(utils.isSet(undefined)).to.be.false;
    });
  });

  describe('isNotSet', () => {

    it('false when not null or undefined', () => {
      expect(utils.isNotSet('')).to.be.false;
      expect(utils.isNotSet(0)).to.be.false;
      expect(utils.isNotSet(true)).to.be.false;
      expect(utils.isNotSet({})).to.be.false;
      expect(utils.isNotSet([])).to.be.false;
    });

    it('true when null or undefined', () => {
      expect(utils.isNotSet(null)).to.be.true;
      expect(utils.isNotSet()).to.be.true;
      expect(utils.isNotSet(undefined)).to.be.true;
    });
  });

  describe('valueOrDefault', () => {

    const testVal = 'A Test Value';
    const testDef = 'A Test Default';

    it('returns the value if set', () => {
      expect(utils.valueOrDefault(testVal, testDef)).to.equal(testVal);
    });

    it('returns the default if null', () => {
      expect(utils.valueOrDefault(null, testDef)).to.equal(testDef);
    });

    it('returns the default is undefined', () => {
      expect(utils.valueOrDefault(undefined, testDef)).to.equal(testDef);

      // eslint-disable-next-line
      let a;

      expect(utils.valueOrDefault(a, testDef)).to.equal(testDef);
    });

    it('returns null if the default is undefined and the value is null', () => {
      expect(utils.valueOrDefault(null)).to.be.null;
    });

  });
});
