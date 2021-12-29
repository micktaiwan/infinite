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

  bookUpdate(bookId, data) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!bookId) throw new Meteor.Error('no-book-id');
    if (!data) throw new Meteor.Error('no-data');
    const book = Books.findOne(bookId);
    if (!book) throw new Meteor.Error('no-book');
    if (!book.userIds.includes(this.userId)) throw new Meteor.Error('not-authorized');
    Books.update(bookId, { $set: data });
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
    if (lines.length === 0) Lines.remove(id);
    else Lines.update(id, { $set: { lines } });
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
    return Layers.insert({ bookId, index, userId: this.userId });
  },

  savePosition(bookId, index, position) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    return Layers.update({ bookId, index }, { $set: { [`positions.${Meteor.userId()}`]: position } });
  },

  stats() {
    const stats = {};
    Books.find({}).forEach(book => {
      const bookId = book._id;
      const lines = Lines.find({ bookId }).count();
      const layers = Layers.find({ bookId }).count();
      const segments = Lines.find({ bookId }).map(line => line.lines.length).reduce((a, b) => a + b, 0);
      stats[bookId] = {
        layers,
        lines,
        segments,
      };
    });
    return stats;
  },

  toggleLayer(id, hidden) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    return Layers.update(id, { $set: { [`positions.${Meteor.userId()}.hidden`]: hidden } });
  },

  removeLayer(_id) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!_id) throw new Meteor.Error('no-layer-id');
    const layer = Layers.findOne(_id);
    Lines.remove({ bookId: layer.bookId, layerIndex: layer.index });
    return Layers.remove(_id);
  },
});
