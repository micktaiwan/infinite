import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import LayerManager from '../imports/classes/layerManager';
import { Layers } from '../imports/api/books/collections';

import './book.html';

Template.book.onCreated(function () {
  Meteor.call('booksAddUser', FlowRouter.getParam('bookId'));
  this.manager = new LayerManager();
});

Template.book.onRendered(function () {
  const bookId = FlowRouter.getParam('bookId');
  this.manager.init(bookId);
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
  this.manager.destroy();
  this.manager = null;
});

Template.book.helpers({
  layers() {
    return Layers.find({ bookId: FlowRouter.getParam('bookId') });
  },
  active(index) {
    if (Layers.findOne({ bookId: FlowRouter.getParam('bookId'), index }).hidden) return 'hidden';
    return index === Session.get('activeLayer') ? 'active' : '';
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
});
