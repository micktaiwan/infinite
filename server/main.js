import { Meteor } from 'meteor/meteor';
import { Drawings } from '../imports/api/books/collections';

import '../imports/api/books/serverMethods';
import '../imports/api/books/methods';
import '../imports/api/books/publish';

Meteor.startup(async () => {
  // code to run on server at startup
  await Drawings.rawCollection().createIndex({ bookId: 1, layerIndex: 1, order: 1 });
  await Drawings.rawCollection().createIndex({ order: 1 });
});
