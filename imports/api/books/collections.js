import { Mongo } from 'meteor/mongo';

const Books = new Mongo.Collection('books');
const Lines = new Mongo.Collection('lines');

export { Books, Lines };
