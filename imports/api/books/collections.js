import { Mongo } from 'meteor/mongo';

const Books = new Mongo.Collection('books');
const Lines = new Mongo.Collection('lines');
const Layers = new Mongo.Collection('layers');

export { Books, Lines, Layers };
