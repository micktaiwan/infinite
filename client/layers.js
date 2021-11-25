import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import LayerManager from './layerManager';
import { Layers } from '../imports/api/books/collections';

import './layers.html';

Template.layers.onCreated(function () {
  this.manager = new LayerManager();
});

Template.layers.onRendered(function () {
  const bookId = FlowRouter.getParam('bookId');
  this.manager.init(bookId);
  this.subscribe('lines', bookId);
  this.subscribe('layers', bookId, () => {
    Session.set('activeLayer', Layers.find({ bookId }).count() - 1);
  });
});

Template.layers.onDestroyed(function () {
  this.manager.destroy();
  this.manager = null;
});

Template.layers.helpers({
  layers() {
    return Layers.find({ bookId: FlowRouter.getParam('bookId') });
  },
  active(index) {
    return index === Session.get('activeLayer') ? 'active' : '';
  },
});

Template.layers.events({
  // 'mouseenter #layers'(e, tpl) {
  //   tpl.manager.focusCurrentLayer();
  //   console.log('focus');
  // },
  'click .js-focus-layer'(e, tpl) {
    const { index } = this;
    tpl.manager.focus(index);
    Session.set('activeLayer', index);
  },
  'click .js-add-layer'(e, tpl) {
    Session.set('activeLayer', Layers.find({ bookId: FlowRouter.getParam('bookId') }).count());
    tpl.manager.addLayer();
  },
});
