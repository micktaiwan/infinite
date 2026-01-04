import { Drawings, Books, Layers } from './collections';

Meteor.methods({

  async booksInsert() {
    if (!this.userId) return;
    const user = await Meteor.userAsync();
    const name = user.profile?.name || user.emails?.[0]?.address || 'My';
    await Books.insertAsync({
      title: `${name}'s book`,
      userIds: [this.userId],
    });
  },

  async bookUpdate(bookId, data) {
    if (!this.userId) return;
    if (!bookId) throw new Meteor.Error('no-book-id');
    if (!data) throw new Meteor.Error('no-data');
    const book = await Books.findOneAsync(bookId);
    if (!book) throw new Meteor.Error('no-book');
    if (!book.userIds.includes(this.userId)) throw new Meteor.Error('not-authorized');
    await Books.updateAsync(bookId, { $set: data });
  },

  async saveDrawings(obj) {
    if (!this.userId) return;
    const lastDrawing = await Drawings.findOneAsync(
      { bookId: obj.bookId, layerIndex: obj.layerIndex },
      { sort: { order: -1 } },
    );
    let order = lastDrawing?.order || 0;
    order++;
    await Drawings.insertAsync(_.extend(obj, {
      order,
      userId: this.userId,
    }));
  },

  async undo(bookId, layerIndex) {
    if (!this.userId) return;
    if (!bookId) throw new Meteor.Error('no-book-id');
    const lastLine = await Drawings.findOneAsync({ bookId, layerIndex }, { sort: { order: -1 } });
    if (!lastLine) return;
    await Drawings.removeAsync(lastLine._id);
  },

  async updateDrawings(id, lines) {
    if (!this.userId) return;
    if (lines.length === 0) await Drawings.removeAsync(id);
    else await Drawings.updateAsync(id, { $set: { lines } });
  },

  async updateDrawingsBatch(changes) {
    if (!this.userId) return;
    for (const { id, type, $set } of changes) {
      if (type === 'removed') {
        await Drawings.removeAsync(id);
      } else {
        await Drawings.updateAsync(id, { $set });
      }
    }
  },

  async addLayer(bookId, index) {
    if (!this.userId) return;
    return Layers.insertAsync({ bookId, index, userId: this.userId });
  },

  async savePosition(bookId, index, position) {
    if (!this.userId) return;
    return Layers.updateAsync({ bookId, index }, { $set: { [`positions.${this.userId}`]: position } });
  },

  async toggleLayer(id, hidden) {
    if (!this.userId) return;
    return Layers.updateAsync(id, { $set: { [`positions.${this.userId}.hidden`]: hidden } });
  },

  async removeLayer(_id) {
    if (!this.userId) return;
    if (!_id) throw new Meteor.Error('no-layer-id');
    const layer = await Layers.findOneAsync(_id);
    await Drawings.removeAsync({ bookId: layer.bookId, layerIndex: layer.index });
    return Layers.removeAsync(_id);
  },

  async savePrefs(prefs) {
    if (!this.userId) return;
    await Meteor.users.updateAsync(this.userId, { $set: { 'profile.prefs': prefs } });
  },

});
