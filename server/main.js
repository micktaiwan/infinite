import { Meteor } from 'meteor/meteor';
import { Lines } from '../imports/api/books/collections';

import '../imports/api/books/methods';
import '../imports/api/books/publish';

Meteor.startup(() => {
  // code to run on server at startup
  Lines.rawCollection().createIndex({ bookId: 1, layerIndex: 1, order: 1 });
  Lines.rawCollection().createIndex({ order: 1 });
});
