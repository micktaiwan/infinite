import { Lines, Books, Layers } from './collections';

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
    let order = Lines.findOne({ bookId, layerIndex }, { sort: { order: -1 } })?.order || 0;
    order++;
    Lines.insert({
      order,
      bookId,
      layerIndex,
      lines,
      userId: this.userId,
    });
  },

  undo(bookId, layerIndex) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!bookId) throw new Meteor.Error('no-book-id');
    const lastLine = Lines.findOne({ bookId, layerIndex }, { sort: { order: -1 } });
    if (!lastLine) return;
    Lines.remove(lastLine._id);
  },

  updateLines(id, lines) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (lines.length === 0) {
      Lines.remove(id);
    } else {
      Lines.update(id, { $set: { lines } });
    }
  },

  updateLinesBatch(changes) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    changes.forEach(({ id, lines }) => {
      if (lines.length === 0) {
        Lines.remove(id);
      } else {
        Lines.update(id, { $set: { lines } });
      }
    });
  },

  addLayer(bookId, index) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    Layers.insert({ bookId, index, userId: this.userId });
  },

  savePosition(bookId, index, position) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    Layers.update({ bookId, index }, { $set: { [`positions.${Meteor.userId()}`]: position } });
  },
  stats() {
    const bookId = this.userId;
    const lines = Lines.find({ bookId }).count();
    const layers = Layers.find({ bookId }).count();
    const stats = {
      bookId,
      lines,
      layers,
    };
    return stats;
  },
});
