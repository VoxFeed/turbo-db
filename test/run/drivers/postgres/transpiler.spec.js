const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

const PostgresTranspiler = require('lib/drivers/postgres/transpiler');
const engine = {name: 'postgres', connection: {pool: {}}};
const schema = require('test/test-helpers/build-single-table-schema')(engine);

const {select, insert, update} = PostgresTranspiler(schema);

describe('Postgres Transpiler', () => {
  describe('Select', () => {
    it('should return correct sql if no where clause is sent', () => {
      const uql = {};
      const expected = 'SELECT * FROM single_table';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with one condition', () => {
      const uql = {where: {name: 'Jon'}};
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with two conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe'}};
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with three conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23}};
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a date range condition', () => {
      const uql = {
        where: {
          createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
        }
      };
      const actual = select(uql);
      const expected = `SELECT * FROM single_table WHERE created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with three regular conditions and a date range condition', () => {
      const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
      const dateRange = {
        createdAt: {
          gte: new Date(startDate),
          lt: new Date(endDate)
        }
      };
      const uql = {where: Object.assign({}, regularConds, dateRange)};
      const actual = select(uql);
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23 AND ' +
       `created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with or operator', () => {
      const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' OR last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with explicit and operator', () => {
      const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a single lt operator', () => {
      const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
      const expected = `SELECT * FROM single_table WHERE tracked=true AND created_at < '${startDate}'`;
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL for single json inner query', () => {
      const uql = {where: {'job.title': 'Programmer'}};
      const expected = 'SELECT * FROM single_table WHERE job->>\'title\'=\'Programmer\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with order and single field to order', () => {
      const uql = {order: [{age: 'ASC'}]};
      const expected = 'SELECT * FROM single_table ORDER BY age ASC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with multiple order conditions', () => {
      const uql = {order: [{age: 'ASC'}, {lastName: 'DESC'}]};
      const expected = 'SELECT * FROM single_table ORDER BY age ASC, last_name DESC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with where conditions and multiple order conditions', () => {
      const uql = {where: {'job.title': 'Programmer'}, order: [{age: 'ASC'}, {lastName: 'DESC'}]};
      const expected = 'SELECT * FROM single_table WHERE job->>\'title\'=\'Programmer\' ' +
       'ORDER BY age ASC, last_name DESC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Insert', () => {
    it('should create sql with one field', () => {
      const data = {name: 'Jon'};
      const expected = 'INSERT INTO single_table (name) VALUES (\'Jon\')';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });

    it('should create sql with two fields', () => {
      const data = {name: 'Jon', lastName: 'Doe'};
      const expected = 'INSERT INTO single_table (name, last_name) VALUES (\'Jon\', \'Doe\')';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });

    it('should create sql with three fields', () => {
      const data = {name: 'Jon', lastName: 'Doe', age: 23};
      const expected = 'INSERT INTO single_table (name, last_name, age) VALUES (\'Jon\', \'Doe\', 23)';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });

    it('should create sql with all schema fields', () => {
      const data = {
        name: 'Jon',
        lastName: 'Doe',
        age: 23,
        tracked: false,
        job: {title: 'Programmer', company: 'VoxFeed'}
      };
      const expected = 'INSERT INTO single_table (name, last_name, age, tracked, job) ' +
        'VALUES (\'Jon\', \'Doe\', 23, false, \'{"title":"Programmer","company":"VoxFeed"}\')';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Update', () => {
    it('should create update SQL with one field', () => {
      const data = {name: 'Jon'};
      const query = {where: {'job.title': 'Programmer'}};
      const expected = 'UPDATE single_table SET name=\'Jon\' WHERE job->>\'title\'=\'Programmer\'';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one field and no conditions', () => {
      const data = {name: 'Jon'};
      const query = {};
      const expected = 'UPDATE single_table SET name=\'Jon\'';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one field and unexistent conditions', () => {
      const data = {name: 'Jon'};
      let query;
      const expected = 'UPDATE single_table SET name=\'Jon\'';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should return empty string if no data is sent', () => {
      const query = {where: {name: 'Jon'}};
      const expected = '';
      const actual = update(query);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one full json field', () => {
      const data = {'job': {title: 'Programmer', companyName: 'VoxFeed'}};
      const query = {where: {name: 'Jon'}};
      const expected = '' +
        'UPDATE single_table SET job=\'{"title":"Programmer","company_name":"VoxFeed"}\' ' +
        'WHERE name=\'Jon\'';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one atribute in json field', () => {
      const data = {'job.title': 'Programmer'};
      const query = {where: {name: 'Jon'}};
      const expected = 'UPDATE single_table SET job->>\'title\'=\'Programmer\' WHERE name=\'Jon\'';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });
  });
});
