import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import LayerManager from '../imports/classes/layers/layerManager';
import { Layers } from '../imports/api/books/collections';

import './book.html';

Template.book.onRendered(function () {
  const bookId = FlowRouter.getParam('bookId');
  this.autorun(() => {
    if (!Meteor.userId()) return;
    Meteor.callAsync('booksAddUser', bookId);
  });
  this.manager = new LayerManager(bookId);
  const self = this;
  this.subscribe('layers', bookId, () => {
    Session.set('activeLayer', Layers.find({ bookId }).count() - 1);
    Meteor.defer(() => {
      self.subscribe('lines', bookId, () => {
        self.manager.redraw();
      });
    });
  });
});

Template.book.onDestroyed(function () {
  if (!this.manager) return;
  this.manager.destroy();
  this.manager = null;
});

Template.book.helpers({
  layers() {
    return Layers.find({ bookId: FlowRouter.getParam('bookId') });
  },
  active(index) {
    if (Layers.findOne({ bookId: FlowRouter.getParam('bookId'), index }).positions?.[Meteor.userId()]?.hidden) return 'hidden';
    return index === Session.get('activeLayer') ? 'active' : '';
  },
  pressure() {
    const type = Session.get('pointerType') || '?';
    const pressure = Session.get('pressure')?.toFixed(2) || '0.00';
    return `${pressure} (${type})`;
  },
});

Template.book.events({
  'click .js-focus-layer'(e, tpl) {
    const { index } = this;
    if (index === Session.get('activeLayer')) {
      tpl.manager.toggleLayer(index);
    } else {
      tpl.manager.focus(index);
      Session.set('activeLayer', index);
    }
  },
  'click .js-add-layer'(e, tpl) {
    Session.set('activeLayer', Layers.find({ bookId: FlowRouter.getParam('bookId') }).count());
    tpl.manager.addLayer();
  },
  'click .js-toggle-layer'(e, tpl) {
    tpl.manager.toggleLayer();
  },
  'click .js-remove-layer'(e, tpl) {
    if (confirm('Are you sure you want to remove the last layer?')) {
      Session.set('activeLayer', tpl.manager.removeLayer());
    }
  },
  'keydown'(e, tpl) {
    if (e.shiftKey && e.keyCode === 84) tpl.manager.toggleLayer();
  },
  'click .js-brush-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 2 });
  },
  'click .js-brush-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 3 });
  },
  'click .js-brush-3'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 15 });
  },
  'click .js-brush-4'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 100 });
  },
  'click .js-shaky-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 3 });
  },
  'click .js-shaky-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 10 });
  },
  'click .js-ballpoint-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 1 });
  },
  'click .js-ballpoint-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 3 });
  },
  'click .js-ballpoint-3'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 10 });
  },
  'click .js-sensitivity-0'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0 });
  },
  'click .js-sensitivity-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0.15 });
  },
  'click .js-sensitivity-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0.3 });
  },
});
