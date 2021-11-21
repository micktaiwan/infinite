import Books from './collections';

Meteor.publish('books', () => Books.find({ userIds: this.userId }));
