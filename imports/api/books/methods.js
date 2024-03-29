import { Drawings, Books, Layers } from './collections';

// splice lines in group of 100

// function saveDrawings(lines, bookId, layerIndex) {
//   let order = Drawings.findOne({ bookId, layerIndex }, { sort: { order: -1 } })?.order || 0;
//   for (let i = 0; i < lines.length; i += 100) {
//     order++;
//     Drawings.insert({
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
    if (!this.userId) return;
    Books.insert({
      title: `${Meteor.user().profile.name}'s book`,
      userIds: [this.userId],
    });
  },

  bookUpdate(bookId, data) {
    if (!this.userId) return;
    if (!bookId) throw new Meteor.Error('no-book-id');
    if (!data) throw new Meteor.Error('no-data');
    const book = Books.findOne(bookId);
    if (!book) throw new Meteor.Error('no-book');
    if (!book.userIds.includes(this.userId)) throw new Meteor.Error('not-authorized');
    Books.update(bookId, { $set: data });
  },

  saveDrawings(obj) {
    if (!this.userId) return;
    let order = Drawings.findOne({ bookId: obj.bookId, layerIndex: obj.layerIndex }, { sort: { order: -1 } })?.order || 0;
    order++;
    Drawings.insert(_.extend(obj, {
      order,
      userId: this.userId,
    }));
  },

  undo(bookId, layerIndex) {
    if (!this.userId) return;
    if (!bookId) throw new Meteor.Error('no-book-id');
    const lastLine = Drawings.findOne({ bookId, layerIndex }, { sort: { order: -1 } });
    if (!lastLine) return;
    Drawings.remove(lastLine._id);
  },

  updateDrawings(id, lines) {
    if (!this.userId) return;
    if (lines.length === 0) Drawings.remove(id);
    else Drawings.update(id, { $set: { lines } });
  },

  updateDrawingsBatch(changes) {
    if (!this.userId) return;
    changes.forEach(({ id, type, $set }) => {
      if (type === 'removed') {
        Drawings.remove(id);
      } else {
        Drawings.update(id, { $set });
      }
    });
  },

  addLayer(bookId, index) {
    if (!this.userId) return;
    return Layers.insert({ bookId, index, userId: this.userId });
  },

  savePosition(bookId, index, position) {
    if (!this.userId) return;
    return Layers.update({ bookId, index }, { $set: { [`positions.${Meteor.userId()}`]: position } });
  },

  toggleLayer(id, hidden) {
    if (!this.userId) return;
    return Layers.update(id, { $set: { [`positions.${Meteor.userId()}.hidden`]: hidden } });
  },

  removeLayer(_id) {
    if (!this.userId) return;
    if (!_id) throw new Meteor.Error('no-layer-id');
    const layer = Layers.findOne(_id);
    Drawings.remove({ bookId: layer.bookId, layerIndex: layer.index });
    return Layers.remove(_id);
  },

  savePrefs(prefs) {
    if (!this.userId) return;
    Meteor.users.update(this.userId, { $set: { 'profile.prefs': prefs } });
  },

});
