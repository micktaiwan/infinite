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
  this.subscribe('lines', bookId);
  this.subscribe('layers', bookId, () => {
    Session.set('activeLayer', Layers.find({ bookId }).count() - 1);
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
    return index === Session.get('activeLayer') ? 'active' : '';
  },
});

Template.book.events({
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
