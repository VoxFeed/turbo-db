const values = require('lodash/values');
const snakeize = require('./../util/snakeize-properties');
const {BadInputError} = require('./../errors');

const types = {
  STRING: 'string',
  TEXT: 'text',
  INTEGER: 'integer',
  JSON: 'json',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DECIMAL: 'decimal'
};

const validTypes = values(types);

const defineSchema = (tableName, def) => {
  _validateDefinition(def);
  const definition = snakeize(def || {});

  const getKnownFields = (data, schema) => {
    const knownFields = Object.keys(definition);
    return Object.keys(data).filter(field => knownFields.includes(field));
  };

  const getFieldType = (field) => definition[field];

  return {tableName, getKnownFields, getFieldType};
};

const _validateDefinition = (definition) => {
  if (!definition) throw BadInputError('schema definition is missing');
  _validateDefinitionTypes(definition);
};

const _validateDefinitionTypes = (definition) => {
  Object.keys(definition).forEach(field => _throwIfBadType(definition[field]));
};

const _throwIfBadType = (type) => {
  if (!validTypes.includes(type)) throw BadInputError(`${type} is not knwon schema type`);
};

module.exports = Object.assign({}, {types}, {defineSchema});