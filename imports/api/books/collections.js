import { Mongo } from 'meteor/mongo';

const Books = new Mongo.Collection('books');
const Drawings = new Mongo.Collection('lines');
const Layers = new Mongo.Collection('layers');

export { Books, Drawings, Layers };
