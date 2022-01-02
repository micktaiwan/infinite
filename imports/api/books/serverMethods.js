import { Drawings, Books, Layers } from './collections';

Meteor.methods({

  booksAddUser(bookId) {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!bookId) throw new Meteor.Error('no-book-id');
    Books.update(bookId, { $addToSet: { userIds: this.userId } });
  },

  stats() {
    const stats = {};
    Books.find({ userIds: this.userId }).forEach(book => {
      const bookId = book._id;
      const drawings = Drawings.find({ bookId }).count();
      const layers = Layers.find({ bookId }).count();
      stats[bookId] = {
        layers,
        drawings,
      };
    });
    return stats;
  },

  optimizeDrawings() {
    // for each lines, split into segments of 100 smaller lines
    let order = 0;
    let count = 0;
    Drawings.find({ type: 'lines' }, { sort: { order: 1 } }).forEach(drawing => {
      count++;
      // if (count % 1000 === 0) { console.log(count); }
      const { lines } = drawing;
      for (let i = 0; i < lines.length; i += 100) {
        order++;
        Drawings.insert({
          bookId: drawing.bookId,
          layerIndex: drawing.layerIndex,
          order,
          lines: lines.slice(i, i + 100),
          userId: drawing.userId,
        });
      }
      Drawings.remove(drawing._id);
    });
    console.log(`optimized ${count} lines`);
  },

  admin(js) {
    try {
      const user = Meteor.users.findOne(this.userId);
      if (!user || !user.admin) throw new Meteor.Error('not-authorized');
      if (!js) return '?';
      return eval(js);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },

});
