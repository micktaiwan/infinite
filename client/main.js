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

Template.layers.onRendered(function () {
  this.manager = new LayerManager();
  // document.addEventListener('focus', trackActiveElement, true);
  // document.addEventListener('blur', trackActiveElementLost, true);
});

Template.layers.events({
  'mouseenter #layers'(e, tpl) {
    tpl.manager.focusCurrentLayer();
    console.log('focus');
  },
  'click .js-focus-sel'(e, tpl) {
    tpl.manager.layers[1].canvas.visible = false;
    tpl.manager.layers[1].canvas.style.display = 'none';

    tpl.manager.layers[0].canvas.zIndex = 100;
    tpl.manager.layers[0].canvas.focus();
    console.log('click');
  },
});
