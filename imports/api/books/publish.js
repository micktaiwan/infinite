import { Books, Drawings, Layers } from './collections';

Meteor.publish('books', function () { return Books.find({ userIds: this.userId }); });
Meteor.publish('lines', bookId => Drawings.find({ bookId }));
Meteor.publish('layers', bookId => Layers.find({ bookId }, { sort: { index: 1 } }));
