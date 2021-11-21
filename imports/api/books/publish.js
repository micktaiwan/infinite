import Books from './collections';

Meteor.publish('books', function () { return Books.find({ userIds: this.userId }); });
