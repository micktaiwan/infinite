import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';
import Board from './board';
import './main.html';

Template.canvas.onRendered(function () {
  this.board = new Board();
});

Template.canvas.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.canvas.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },

});
