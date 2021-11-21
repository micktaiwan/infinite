import { Lines, Books } from './collections';

Meteor.methods({
  booksInsert() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    Books.insert({
      title: `${Meteor.user().profile.name}'s book`,
      userIds: [this.userId],
    });
  },

  booksAddUser(bookId) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!bookId) throw new Meteor.Error('no-book-id');
    Books.update(bookId, { $addToSet: { userIds: this.userId } });
  },

  saveLines({ lines, layerIndex, bookId }) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!lines.length) return;
    Lines.insert({
      bookId,
      layerIndex,
      lines,
      userId: this.userId,
    });
  },

  updateLines(id, lines) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (lines.length === 0) {
      Lines.remove(id);
    } else {
      Lines.update(id, { $set: { lines } });
    }
  },

});
