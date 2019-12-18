CREATE TABLE `todos` (
  `id` integer not null primary key autoincrement,
  `title` varchar(16) not null,
  `creatorId` integer not null,
  `ownerId` integer default null,
  `projectId` integer default null
);

CREATE TABLE `users` (
  `id` integer not null primary key autoincrement,
  `name` varchar(256) not null,
  `age` integer
);

CREATE TABLE `comments` (
  `id` integer not null primary key autoincrement,
  `comment` varchar(256) not null,
  `userId` integer,
  `todoId` integer
);

CREATE TABLE `projects` (
  `id` integer not null primary key autoincrement,
  `creatorId` integer not null,
  `name` varchar(256) not null
);