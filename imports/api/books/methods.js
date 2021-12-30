import { Lines, Books, Layers } from './collections';

// splice lines in group of 100

// function saveLines(lines, bookId, layerIndex) {
//   let order = Lines.findOne({ bookId, layerIndex }, { sort: { order: -1 } })?.order || 0;
//   for (let i = 0; i < lines.length; i += 100) {
//     order++;
//     Lines.insert({
//       bookId,
//       layerIndex,
//       order,
//       lines: lines.slice(i, i + 100),
//       userId: this.userId,
//     });
//   }
// }

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
