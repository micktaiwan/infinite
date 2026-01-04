import { Template } from 'meteor/templating';
import './home.html';
import { Books } from '../imports/api/books/collections';

Template.home.onCreated(function () {
  this.subscribe('books');
  Meteor.callAsync('stats').then(res => {
    Session.set('stats', res);
  });
});

Template.home.helpers({
  bookCovers() { return Books.find({}); },
});

Template.home.events({
  'click .js-insert-book'() {
    if (!Meteor.userId()) { alert('Please log in to add a book'); return; }
    Meteor.callAsync('booksInsert');
  },
});

Template.bookCover.helpers({
  stats(bookId) { return Session.get('stats')?.[bookId]; },
  users() { return this.userIds.length; },
});

Template.bookCover.events({
  'keydown .title'(e) {
    if (e.keyCode !== 13) return;
    e.preventDefault();
    const title = $(e.target).text();
    Meteor.callAsync('bookUpdate', this._id, { title });
    e.target.blur();
  },
});
