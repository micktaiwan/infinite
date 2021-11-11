import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';
import Board from './board';
import './main.html';

Template.hello.onRendered(function helloOnCreated() {
  this.board = new Board();
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },

});
