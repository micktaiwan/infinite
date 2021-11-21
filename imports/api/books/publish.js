import { Books, Lines } from './collections';

Meteor.publish('books', function () { return Books.find({ userIds: this.userId }); });
Meteor.publish('lines', bookId => Lines.find({ bookId }));
