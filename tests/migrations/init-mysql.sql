CREATE TABLE todos (
  id integer not null primary key auto_increment,
  title varchar(16) not null,
  creatorId integer not null,
  ownerId integer default null,
  projectId integer default null
);

CREATE TABLE users (
  id integer not null primary key auto_increment,
  name varchar(256) not null,
  age integer
);

CREATE TABLE comments (
  id integer not null primary key auto_increment,
  comment varchar(256) not null,
  userId integer,
  todoId integer
);

CREATE TABLE projects (
  id integer not null primary key auto_increment,
  creatorId integer not null,
  name varchar(256) not null
);

INSERT INTO users (id, name, age) VALUES (1, 'Alice A', 21), (2, 'Bob B', 33), (3, 'Carl C', 44);
INSERT INTO projects (id, creatorId, name) VALUES (1, 1, 'Busy Project'), (2, 2, 'Empty Project');
INSERT INTO comments (id, userId, todoId, comment) VALUES (1, 1, 1, 'A'),  (2, 2, 1, 'B'),  (3, 1, 1, 'C');
INSERT INTO todos (id, title, creatorId, projectId, ownerId) VALUES (1, 'Find something', 1, 1, null), (2, 'Cook something', 1, 1, 3), (3, 'Run unit-test', 2, 1, 2), (4, 'Write unit-test', 2, 1, null);
