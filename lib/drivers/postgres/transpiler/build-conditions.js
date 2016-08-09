const {first, flatten, isInteger, isNumber} = require('lodash');
const snakeobj = require('snakeobj');
const isDotNotation = require('./../../../util/is-dot-notation');

const BOOLEAN_OPERATORS = ['and', 'or'];
const AND = ' AND ';
const OR = ' OR ';

const OPERATORS = {
  'or': OR,
  'and': AND,
  'gt': '>',
  'gte': '>=',
  'lt': '<',
  'lte': '<='
};

const ID_REPLACER = '{idPlaceHolder}';

module.exports = model => {
  const buildQueryConditions = query => {
    const conds = query ? buildConditions(query) : null;
    return conds ? ` WHERE ${conds}` : '';
  };

  const buildOrderConditions = query => {
    const conds = query ? query.map(orderCondition) : null;
    return conds ? ` ORDER BY ${conds.join(', ')}` : '';
  };

  const orderCondition = order => {
    const field = first(Object.keys(order));
    const table = model.getCollectionForField(field);
    const value = order[field];
    return `${table}.${field} ${value}`;
  };

  const buildConditions = query => {
    const fieldsOrOps = Object.keys(query);
    return fieldsOrOps.map(buildCondition(query))
    .filter(cond => !!cond)
    .join(AND);
  };

  const buildCondition = (query) => {
    return field => {
      if (isSubQuery(query, field)) return generateSubQuery(field, query[field]);
      if (isDotNotation(field)) return buildConditionForDotNotation(field, query);
      return _buildConditionForRegularField(field, query);
    };
  };

  const buildConditionForDotNotation = (field, query) => {
    const jsonFieldName = field.replace(/\.(\w+)/g, '->>\'$1\'');
    const table = model.getCollectionForField(first(field.split('.')));
    const value = `'${query[field]}'`;
    return `${table}.${jsonFieldName}=${value}`;
  };

  const _buildConditionForRegularField = (field, query) => {
    const type = model.getFieldType(field);
    const table = model.getCollectionForField(field);
    const value = generateValueForCondition(type, query[field]);
    if (type === 'json') return `${table}.${field}::jsonb @> ${value}::jsonb`;
    return `${table}.${field}=${value}`;
  };

  const isBooleanOperator = op => BOOLEAN_OPERATORS.includes(op);

  const isSubQuery = (query, field) => {
    const val = query[field];
    if (model.getFieldType(field) === 'json') return false;
    return val && typeof val === 'object' && typeof val.getTime === 'undefined';
  };

  const generateSubQuery = (field, val, _model) => {
    if (isBooleanOperator(field)) return buildSubqueryWithBooleanOperator(field, val, _model);
    return buildSubqueryWithInternalOperators(field, val, _model);
  };

  const buildSubqueryWithBooleanOperator = (op, fieldValues, _model) => {
    const subquery = fieldValues.map(fv => Object.keys(fv).map(buildCondition(fv, _model)));
    return flatten(subquery).join(parseOperator(op));
  };

  const buildSubqueryWithInternalOperators = (field, val, _model) => {
    const subquery = Object.keys(val)
    .map(op => buildConditionsWithOperator(field, op, val[op], _model));
    return subquery.join(AND);
  };

  const generateValueForCondition = (type, val) => {
    const parseValue = _valueParserSelector[type];
    return parseValue ? parseValue(val) : '';
  };

  const buildConditionsAndSorting = query => {
    const {where = null, order = null} = snakeobj(query);
    return {
      conditions: buildQueryConditions(where),
      sorting: buildOrderConditions(order)
    };
  };

  const buildConditionsWithOperator = (field, op, val) => {
    const type = model.getFieldType(field);
    const table = model.getCollectionForField(field);
    const value = generateValueForCondition(type, val);
    const operator = parseOperator(op);
    return `${table}.${field} ${operator} ${value}`;
  };

  const parseOperator = op => OPERATORS[op];

  const _escapeForSql = value => value.replace(/'/g, "''");

  const _parseString = value => {
    if (_isIdPlaceHolder(value)) return value;
    return value ? `'${_escapeForSql(value.toString())}'` : 'null';
  };

  const _parseBoolean = value => value ? 'true' : 'false';

  const _parseInteger = value => {
    if (_isIdPlaceHolder(value)) return value;
    return isInteger(value) ? value : 'null';
  };

  const _parseDecimal = value => isNumber(value) ? value : 'null';

  const _parseJSON = value => `'${JSON.stringify(value)}'`;

  const _parseDate = value => `'${value.toISOString()}'`;

  const _isIdPlaceHolder = val => val === ID_REPLACER;

  const _valueParserSelector = {
    'string': _parseString,
    'text': _parseString,
    'integer': _parseInteger,
    'decimal': _parseDecimal,
    'boolean': _parseBoolean,
    'json': _parseJSON,
    'date': _parseDate,
    'uuid': _parseString
  };

  return {
    buildQueryConditions, buildOrderConditions, buildConditions,
    buildConditionsAndSorting, generateValueForCondition
  };
};