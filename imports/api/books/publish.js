import { Books, Drawings, Layers } from './collections';

Meteor.publish('books', function () { return Books.find({ userIds: this.userId }); });

Meteor.publish('lines', async function (bookId) {
  const book = await Books.findOneAsync({ _id: bookId, userIds: this.userId });
  if (!book) return this.ready();
  return Drawings.find({ bookId });
});

Meteor.publish('layers', async function (bookId) {
  const book = await Books.findOneAsync({ _id: bookId, userIds: this.userId });
  if (!book) return this.ready();
  return Layers.find({ bookId }, { sort: { index: 1 } });
});
