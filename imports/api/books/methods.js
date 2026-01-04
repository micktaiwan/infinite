import { Drawings, Books, Layers } from './collections';

// Helper to check if user has access to a book
async function checkBookAccess(bookId, userId) {
  if (!userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
  if (!bookId) throw new Meteor.Error('no-book-id', 'Book ID is required');
  const book = await Books.findOneAsync({ _id: bookId, userIds: userId });
  if (!book) throw new Meteor.Error('not-authorized', 'You do not have access to this book');
  return book;
}

// Compute bounding box from points
function computeBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

Meteor.methods({

  async booksInsert() {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    const user = await Meteor.userAsync();
    const name = user.profile?.name || user.emails?.[0]?.address || 'My';
    await Books.insertAsync({
      title: `${name}'s book`,
      userIds: [this.userId],
    });
  },

  async bookUpdate(bookId, data) {
    await checkBookAccess(bookId, this.userId);
    if (!data) throw new Meteor.Error('no-data', 'Data is required');
    await Books.updateAsync(bookId, { $set: data });
  },

  async saveDrawings(obj) {
    await checkBookAccess(obj.bookId, this.userId);
    const lastDrawing = await Drawings.findOneAsync(
      { bookId: obj.bookId, layerIndex: obj.layerIndex },
      { sort: { order: -1 } },
    );
    let order = lastDrawing?.order || 0;
    order++;

    const doc = {
      ...obj,
      order,
      userId: this.userId,
    };

    if (obj.points) {
      doc.bounds = computeBounds(obj.points);
    }

    await Drawings.insertAsync(doc);
  },

  async undo(bookId, layerIndex) {
    await checkBookAccess(bookId, this.userId);
    const lastLine = await Drawings.findOneAsync({ bookId, layerIndex }, { sort: { order: -1 } });
    if (!lastLine) return;
    await Drawings.removeAsync(lastLine._id);
  },

  async updateDrawings(id, data) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    const drawing = await Drawings.findOneAsync(id);
    if (!drawing) throw new Meteor.Error('not-found', 'Drawing not found');
    await checkBookAccess(drawing.bookId, this.userId);

    const $set = {};

    if (data.points !== undefined) {
      if (data.points.length < 2) {
        await Drawings.removeAsync(id);
        return;
      }
      $set.points = data.points;
      $set.bounds = computeBounds(data.points);
    }

    if (data.style !== undefined) {
      $set.style = data.style;
    }

    if (Object.keys($set).length > 0) {
      await Drawings.updateAsync(id, { $set });
    }
  },

  async updateDrawingsBatch(changes) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    // Verify access for all drawings first
    const drawingIds = changes.map(c => c.id);
    const drawings = await Drawings.find({ _id: { $in: drawingIds } }).fetchAsync();
    const bookIds = [...new Set(drawings.map(d => d.bookId))];
    for (const bookId of bookIds) {
      await checkBookAccess(bookId, this.userId);
    }
    // Now perform updates
    for (const { id, type, $set } of changes) {
      if (type === 'removed') {
        await Drawings.removeAsync(id);
      } else {
        await Drawings.updateAsync(id, { $set });
      }
    }
  },

  async addLayer(bookId, index) {
    await checkBookAccess(bookId, this.userId);
    return Layers.insertAsync({ bookId, index, userId: this.userId });
  },

  async savePosition(bookId, index, position) {
    await checkBookAccess(bookId, this.userId);
    return Layers.updateAsync({ bookId, index }, { $set: { [`positions.${this.userId}`]: position } });
  },

  async toggleLayer(id, hidden) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    const layer = await Layers.findOneAsync(id);
    if (!layer) throw new Meteor.Error('not-found', 'Layer not found');
    await checkBookAccess(layer.bookId, this.userId);
    return Layers.updateAsync(id, { $set: { [`positions.${this.userId}.hidden`]: hidden } });
  },

  async removeLayer(_id) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    if (!_id) throw new Meteor.Error('no-layer-id', 'Layer ID is required');
    const layer = await Layers.findOneAsync(_id);
    if (!layer) throw new Meteor.Error('not-found', 'Layer not found');
    await checkBookAccess(layer.bookId, this.userId);
    await Drawings.removeAsync({ bookId: layer.bookId, layerIndex: layer.index });
    return Layers.removeAsync(_id);
  },

  async savePrefs(prefs) {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    await Meteor.users.updateAsync(this.userId, { $set: { 'profile.prefs': prefs } });
  },

});
