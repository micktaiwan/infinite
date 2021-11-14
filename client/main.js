import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';
import LayerManager from './layerManager';
import './main.html';

function trackActiveElement() {
  console.log('active', document.activeElement);
}

function trackActiveElementLost() {
  console.log('lost');
}

Template.registerHelper('log', text => console.log(text));
Template.registerHelper('add', (v, nb) => v + nb);

Template.layers.onRendered(function () {
  this.manager = new LayerManager();
  Session.set('layers', this.manager.getLayers());
  // document.addEventListener('focus', trackActiveElement, true);
  // document.addEventListener('blur', trackActiveElementLost, true);
});

Template.layers.helpers({
  layers() {
    return Session.get('layers');
  },
});

Template.layers.events({
  'mouseenter #layers'(e, tpl) {
    tpl.manager.focusCurrentLayer();
    console.log('focus');
  },
  'click .js-focus-layer'(e, tpl) {
    console.log('focus', this);
    tpl.manager.focus(this);
  },
  'click .js-add-layer'(e, tpl) {
    tpl.manager.addLayer();
    Session.set('layers', tpl.manager.getLayers());
  },
});
