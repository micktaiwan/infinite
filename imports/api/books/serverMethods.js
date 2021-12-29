import { Lines } from './collections';

Meteor.methods({

  optimizeLines() {
    // for each lines, split into segments of 100 smaller lines
    Lines.find({}).forEach(line => {
      const { lines } = line;
      for (let i = 0; i < lines.length; i += 100) {
        Lines.insert({
          bookId: line.bookId,
          layerIndex: line.layerIndex,
          lines: lines.slice(i, i + 100),
          userId: line.userId,
        });
      }
      Lines.remove(line._id);
    });
  },

});
