import { Lines, Books, Layers } from './collections';

Meteor.methods({

  stats() {
    const stats = {};
    Books.find({ userIds: this.userId }).forEach(book => {
      const bookId = book._id;
      const lines = Lines.find({ bookId });
      const layers = Layers.find({ bookId }).count();
      let max = 0;
      const segments = lines.map(line => {
        if (line.lines.length > max) max = line.lines.length;
        return line.lines.length;
      }).reduce((a, b) => a + b, 0);
      stats[bookId] = {
        layers,
        lines: lines.count(),
        segments,
        max,
      };
    });
    return stats;
  },

  optimizeLines() {
    // for each lines, split into segments of 100 smaller lines
    let order = 0;
    let count = 0;
    Lines.find({}, { sort: { order: 1 } }).forEach(line => {
      count++;
      // if (count % 1000 === 0) { console.log(count); }
      const { lines } = line;
      for (let i = 0; i < lines.length; i += 100) {
        order++;
        Lines.insert({
          bookId: line.bookId,
          layerIndex: line.layerIndex,
          order,
          lines: lines.slice(i, i + 100),
          userId: line.userId,
        });
      }
      Lines.remove(line._id);
    });
    console.log(`optimized ${count} lines`);
  },
});
