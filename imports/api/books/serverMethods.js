import { Drawings, Books, Layers } from './collections';

Meteor.methods({

  // booksAddUser removed - security vulnerability allowing self-add to any book
  // TODO: Implement proper invitation system if sharing is needed

  async stats() {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
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

  async optimizeDrawings(bookId) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    if (!bookId) throw new Meteor.Error('no-book-id', 'Book ID is required');
    const book = await Books.findOneAsync({ _id: bookId, userIds: this.userId });
    if (!book) throw new Meteor.Error('not-authorized', 'You do not have access to this book');

    // for each lines in this book, split into segments of 100 smaller lines
    let order = 0;
    let count = 0;
    const drawings = await Drawings.find({ bookId, type: 'lines' }, { sort: { order: 1 } }).fetchAsync();
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
          type: 'lines',
        });
      }
      await Drawings.removeAsync(drawing._id);
    }
    console.log(`optimized ${count} lines in book ${bookId}`);
    return count;
  },

});
