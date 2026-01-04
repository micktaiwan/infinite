import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import LayerManager from '../imports/classes/layers/layerManager';
import { Layers } from '../imports/api/books/collections';

import './book.html';

// Menu and tool state
Session.setDefault('menuOpen', null);
Session.setDefault('activeBrush', 'lines');
Session.setDefault('activeBrushSize', 3);
Session.setDefault('activeSensitivity', 0);

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

  // Close menu when clicking outside
  this.closeMenuHandler = e => {
    if (!Session.get('menuOpen')) return;
    if (!e.target.closest('.menu-item')) {
      Session.set('menuOpen', null);
    }
  };
  document.addEventListener('click', this.closeMenuHandler);
});

Template.book.onDestroyed(function () {
  if (this.closeMenuHandler) {
    document.removeEventListener('click', this.closeMenuHandler);
  }
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
  menuOpen(menuName) {
    return Session.get('menuOpen') === menuName ? 'open' : '';
  },
  activeBrushLabel() {
    const type = Session.get('activeBrush');
    const size = Session.get('activeBrushSize');
    const labels = { lines: 'Brush', paper: 'Pen', shaky: 'Shaky' };
    return `${labels[type] || 'Brush'} ${size}`;
  },
  activeBrushClass(brushType, size) {
    const currentType = Session.get('activeBrush');
    const currentSize = Session.get('activeBrushSize');
    return (currentType === brushType && currentSize === size) ? 'active' : '';
  },
  activeSensitivityLabel() {
    const sens = Session.get('activeSensitivity');
    if (sens === 0) return 'S0';
    if (sens === 0.15) return 'S1';
    if (sens === 0.3) return 'S2';
    return 'S?';
  },
  activeSensitivityClass(value) {
    return Session.get('activeSensitivity') === value ? 'active' : '';
  },
});

Template.book.events({
  // Menu toggle (vertical menu - click on icon)
  'click #vmenu .menu-item > .button'(e) {
    e.stopPropagation();
    const menuItem = e.currentTarget.closest('.menu-item');
    const menuName = menuItem.dataset.menu;
    const currentOpen = Session.get('menuOpen');
    Session.set('menuOpen', currentOpen === menuName ? null : menuName);
  },

  // Menu toggle (horizontal menu - click on menu item itself)
  'click #hmenu > .menu-item'(e) {
    // Don't toggle if clicking on submenu
    if (e.target.closest('.submenu')) return;
    e.stopPropagation();
    const menuName = e.currentTarget.dataset.menu;
    const currentOpen = Session.get('menuOpen');
    Session.set('menuOpen', currentOpen === menuName ? null : menuName);
  },

  // Close menu after selecting submenu item
  'click .submenu li:not(.sep):not(.spacer)'() {
    Meteor.setTimeout(() => Session.set('menuOpen', null), 150);
  },

  // Layer events
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

  // Brush events with state updates
  'click .js-brush-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 2 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 2);
  },
  'click .js-brush-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 3 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 3);
  },
  'click .js-brush-3'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 15 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 15);
  },
  'click .js-brush-4'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 100 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 100);
  },
  'click .js-shaky-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 3 });
    Session.set('activeBrush', 'shaky');
    Session.set('activeBrushSize', 3);
  },
  'click .js-shaky-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 10 });
    Session.set('activeBrush', 'shaky');
    Session.set('activeBrushSize', 10);
  },
  'click .js-ballpoint-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 1 });
    Session.set('activeBrush', 'paper');
    Session.set('activeBrushSize', 1);
  },
  'click .js-ballpoint-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 3 });
    Session.set('activeBrush', 'paper');
    Session.set('activeBrushSize', 3);
  },
  'click .js-ballpoint-3'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 10 });
    Session.set('activeBrush', 'paper');
    Session.set('activeBrushSize', 10);
  },

  // Sensitivity events with state updates
  'click .js-sensitivity-0'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0 });
    Session.set('activeSensitivity', 0);
  },
  'click .js-sensitivity-1'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0.15 });
    Session.set('activeSensitivity', 0.15);
  },
  'click .js-sensitivity-2'(e, tpl) {
    tpl.manager.setBrush(tpl.manager.brush, { minSensitivity: 0.3 });
    Session.set('activeSensitivity', 0.3);
  },
});
