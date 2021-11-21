import Books from './collections';

Meteor.methods({
  booksInsert() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    Books.insert({
      title: 'New Book',
      userIds: [this.userId],
    });
  },

});
