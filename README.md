# Real-Time Data Sync - Queries

This is a query parser and executor for [RTDS Server](https://github.com/wigy/rtds-server).

## Drivers

In order to execute queries, a driver needs to be instantiated. That is
```
const driver = Driver.create('sqlite://path/to/file.sqlite');
```
Currently supported driver is `sqlite`. In addition for testing there is dummy driver `sql`,
which is able to construct SQL queries. It is also used as a base-class for other drivers.


## Query Description Object

### Reading Data

A query is constructed from object presentation like
```
const q = new Query({
  select: ['id', 'name'],
  pk: 'id',
  table: 'users'
})
```
and is executed as is `q.select(driver)` or with additional condition like
`q.select(driver, 'id=3')`. Each mentioned variable must be listed in `select` field
of the query. Return value is an array of objects, for example
```
[
  { id: 1, 'Alice A' },
  { id: 2, 'Bob B' },
  { id: 3, 'Carl C' }
]
```
The queried structure can be complex. More about members and collections in next section.

### Creating Objects

New entries can be created using `insert`-query defined as
```
const q = new Query({
  insert: ['name'],
  pk: 'id',
  table: 'users'
})
```
It is used as `q.create(driver, {name: 'New user'})`. It can also take multiple rows to
insert, for example `q.create(driver, [{name: 'New user'}, name: 'New user II'}])`.
In query, `insert` field lists columns, that are allowed to be specified. If the field
is not specified, it is not allowed in the query.

### Updating Objects

Existing object can be changed by defining a query
```
const q = new Query({
  update: ['name'],
  pk: 'id',
  table: 'users'
})
```
Usage is similar to creation, but primary key defined as `pk` is required. For example
`q.update(driver, {id: 2, name: 'New Name'})`.

### Deleting Objects

A deletion is specified as
```
const q = new Query({
  delete: ['id', 'name'],
  pk: 'id',
  table: 'users'
})
```
The list of columns in `delete` specifies columns, that can be used for defining deletion
targets, like in `q.delete(driver, {name: 'Delete Me'})` or `q.delete(driver, {id: 2})`.

## Structural Queries

The resulting structure can contain complex parts that are automatically constructed
from the query. The resulting JSON-structures are especially suitable for rendering with
[RTDS Client](https://github.com/wigy/rtds-client).

### Members, Collections and Joins

An object inside an other object can be created using field `members` and defining `join`.
```
const q = new Query({
  select: ['id', 'name'],
  pk: 'id',
  table: 'users',
  members: [
    select: ['id', 'role'],
    table: 'roles',
    as: 'role',
    pk: 'id',
    join: ['users.roleId', 'roles.id']
  ]
})
```
Here the `join` describes a connection between user to the role. Note that a field `roleId`
in the `users` table does not need to be listed in `select` part. Also we use here alias `as`
to rename the table in singular `role` instead of plural `roles`. Note that it does NOT affect
the join definition. The join definition must always use the non-aliased version. The result
may look like this:
```
[
  { id: 1, 'Alice A', role: { id: 1, role: 'Admin'} },
  { id: 2, 'Bob B', role: { id: 2, role: 'User'} },
  { id: 3, 'Carl C', role: { id: 2, role: 'User'} }
]
```

In addition to members, joined tables can be presented as a collections. For example
```
const q = new Query({
  select: ['id', 'name'],
  pk: 'id',
  table: 'users',
  collections: [
    select: ['id', 'text'],
    table: 'comments',
    pk: 'id',
    leftJoin: ['comments.userId', 'users.id']
  ]
})
```
The collection is added as an array of objects to the host object. Duplicates (according to
primary key(s) `pk` values) and null values are removed from the collection. For example, the
result from the previous query could be:
```
[
  { id: 1, 'Alice A', comments: [ { id: 1, text: "My comment"} ] },
  { id: 2, 'Bob B', comments: [ { id: 2, text: "My response"}, { id: 2, text: "My another" }] },
  { id: 3, 'Carl C', comments: [] }
]
```

Both members and collections can be nested in arbitrary manner. For debugging purposes, the
actual SQL-query to be used can be displayed with
```
console.log(q.selectSQL(driver));
```

## Query Description Fields

### `as`
An alias that can be used to rename table as something else in `members` or `collections`
definition.

### `collections`
An array of query descriptions, interpreted as additional joins in the query, which are
collected as an array in the result using the table name (or its alias from `as`) as a
name of the collection.

### `delete`
Defines a deletion query. A list of allowed columns for specifying objects to delete are
listed as an array. Value is either an array of strings or if just a single value, it can
be given directly. Allowed only at the top level of the query description.

### `insert`
Defines a insertion query. A list of allowed columns for specifying the new object are listed
as an array. Allowed only at the top level of the query description.

### `join`
Define inner join between tables. Argument is a pair of two keys in the format `table.column`.
Note that table must be the original table name and NOT alias. Also columns do no need to be
listed in the `select`.

### `leftJoin`
Define left join between tables. Argument is a pair of two keys in the format `table.column`.
Note that table must be the original table name and NOT alias. Also columns do no need to be
listed in the `select`.

### `members`
An array of query descriptions, interpreted as additional joins in the query, which are
assigned as an additional members to the parent object using the table name (or its alias
from `as`) as a name of the member.

### `order`
To set order for results a single string or multiple strings of the column names can be used.
If the name is prefixed with `-`, then the order is descending.

### `pk`
Primary keys for the related table. If not defined, the default is single key `id`. If given
as a string, it refers to the single primary key. If given as an array, it refers to the
multiple column primary keys. Note that it does not necessarily have anything to do with the
actual database. Any field can be used here and it is used for row identification purposes only.

### `process`
Define a mapping from column names to the processing instructions defined as a string. The
string specifies a function to run in the end for that particular column value. Functions are
implemented in driver specific manner. Currently only processing function is `"json"`, which
handles conversion from string value to the JSON-object format. Sqlite implementation stores
JSON-fields as text and this fixes it.

### `select`
Columns to collect from a table. Either single string value or an array of multiple values.
Can be also defined as aliases like `{"originalKey": "newKey"}`. Note that currently each
alias needs to be defined separately and not in the single object. All columns, that are used
in the `where` conditions or additional conditions given as an argument, must be listed
in the `select` field.

### `table`
Defines the name of the table to use. Also, if no alias defined, it is used as a name of the
member or collection inside the sub-query definitions.

### `update`
Defines a update query. A list of allowed columns for specifying the changes are listed
as an array. Allowed only at the top level of the query description.

### `where`
Additional condition for the query as a string expression. Each variable can refer only columns
on the table where the condition is given or any of its parents.
