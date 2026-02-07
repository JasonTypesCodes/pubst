
function hasOwnProperty(item, key) {
  return Object.prototype.hasOwnProperty.call(item, key);
}

function isUndefined(input) {
  return typeof input === 'undefined';
}

function isDefined(input) {
  return !isUndefined(input);
}

function isNotSet(item) {
  return item === null || isUndefined(item);
}

function isSet(item) {
  return !isNotSet(item);
}

function valueOrDefault(value, def) {
  if(isNotSet(value) && isDefined(def)){
    return def;
  }

  return value;
}

export {
  hasOwnProperty,
  isUndefined,
  isDefined,
  isNotSet,
  isSet,
  valueOrDefault
};
