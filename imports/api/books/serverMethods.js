import { Drawings, Books, Layers } from './collections';

Meteor.methods({

  async booksAddUser(bookId) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!bookId) throw new Meteor.Error('no-book-id');
    await Books.updateAsync(bookId, { $addToSet: { userIds: this.userId } });
  },

  async stats() {
    const stats = {};
    const books = await Books.find({ userIds: this.userId }).fetchAsync();
    for (const book of books) {
      const bookId = book._id;
      const drawings = await Drawings.find({ bookId }).countAsync();
      const layers = await Layers.find({ bookId }).countAsync();
      stats[bookId] = {
        layers,
        drawings,
      };
    }
    return stats;
  },

  async optimizeDrawings() {
    // for each lines, split into segments of 100 smaller lines
    let order = 0;
    let count = 0;
    const drawings = await Drawings.find({ type: 'lines' }, { sort: { order: 1 } }).fetchAsync();
    for (const drawing of drawings) {
      count++;
      const { lines } = drawing;
      for (let i = 0; i < lines.length; i += 100) {
        order++;
        await Drawings.insertAsync({
          bookId: drawing.bookId,
          layerIndex: drawing.layerIndex,
          order,
          lines: lines.slice(i, i + 100),
          userId: drawing.userId,
        });
      }
      await Drawings.removeAsync(drawing._id);
    }
    console.log(`optimized ${count} lines`);
  },

  async admin(js) {
    try {
      const user = await Meteor.users.findOneAsync(this.userId);
      if (!user || !user.admin) throw new Meteor.Error('not-authorized');
      if (!js) return '?';
      return eval(js);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },

});
