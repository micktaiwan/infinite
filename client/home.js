import { Template } from 'meteor/templating';
import './home.html';
import { Books } from '../imports/api/books/collections';

Template.home.onCreated(function () {
  this.subscribe('books');
  Meteor.call('stats', (err, res) => {
    Session.set('stats', res);
  });
});

Template.home.helpers({
  bookCovers() { return Books.find({}); },
});

Template.home.events({
  'click .js-insert-book'() {
    if (!Meteor.userId()) { alert('Please log in to add a book'); return; }
    Meteor.call('booksInsert');
  },
});

Template.bookCover.helpers({
  stats(bookId) { return Session.get('stats')?.[bookId]; },
});
