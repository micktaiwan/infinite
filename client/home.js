import { Template } from 'meteor/templating';
import './home.html';
import Books from '../imports/api/books/collections';

Template.home.helpers({
  books() {
    return Books.find({});
  },
});

Template.home.events({
  'click .js-insert-book'() {
    if (!Meteor.userId()) {
      alert('Please log in to add a book');
      return;
    }
    Meteor.call('booksInsert');
  },
});
