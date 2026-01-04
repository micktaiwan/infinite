import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import LayerManager from '../imports/classes/layers/layerManager';
import { Drawings, Layers } from '../imports/api/books/collections';

import './book.html';

// Menu and tool state
Session.setDefault('menuOpen', null);
Session.setDefault('activeBrush', 'lines');
Session.setDefault('activeBrushSize', 3);
Session.setDefault('activeSensitivity', 0);
Session.setDefault('activeColor', '#000000');
Session.setDefault('cullingEnabled', true);

Template.book.onRendered(function () {
  const bookId = FlowRouter.getParam('bookId');
  this.subscribe('books');
  this.autorun(() => {
    if (!Meteor.userId()) return;
    Meteor.callAsync('booksAddUser', bookId);
  });
  this.manager = new LayerManager(bookId);
  const self = this;
  this.subscribe('layers', bookId, () => {
    const layerCount = Layers.find({ bookId }).count();
    if (layerCount === 0) {
      self.manager.addLayer();
    }
    Session.set('activeLayer', Math.max(0, layerCount - 1));
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
      self.manager.focusCurrentLayerCanvas();
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
  objectCount() {
    const bookId = FlowRouter.getParam('bookId');
    return Drawings.find({ bookId }).count();
  },
  drawTime() {
    return Session.get('drawTime') || '0';
  },
  cullingEnabled() {
    return Session.get('cullingEnabled');
  },
  drawnCount() {
    return Session.get('drawnCount') || 0;
  },
  zoom() {
    const scale = Session.get('zoom') || 1;
    const log2 = Math.log2(scale);
    const rounded = Math.round(log2 * 10) / 10;
    const sign = rounded >= 0 ? '+' : '';
    return `${sign}${rounded}`;
  },
  menuOpen(menuName) {
    return Session.get('menuOpen') === menuName ? 'open' : '';
  },
  activeBrushLabel() {
    const type = Session.get('activeBrush');
    const size = Session.get('activeBrushSize');
    const labels = { lines: 'Brush', paper: 'Pen', shaky: 'Shaky', calligraphy: 'Calligraphy' };
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
  activeColor() {
    return Session.get('activeColor');
  },
  activeColorClass(color) {
    return Session.get('activeColor') === color ? 'active' : '';
  },
});

Template.book.events({
  // Menu toggle (vertical menu - click on icon)
  'click #vmenu .menu-item > .button'(e, tpl) {
    e.stopPropagation();
    const menuItem = e.currentTarget.closest('.menu-item');
    const menuName = menuItem.dataset.menu;
    const currentOpen = Session.get('menuOpen');
    Session.set('menuOpen', currentOpen === menuName ? null : menuName);
    tpl.manager.focusCurrentLayerCanvas();
  },

  // Menu toggle (horizontal menu - click on menu item itself)
  'click #hmenu > .menu-item'(e, tpl) {
    // Don't toggle if clicking on submenu
    if (e.target.closest('.submenu')) return;
    e.stopPropagation();
    const menuName = e.currentTarget.dataset.menu;
    const currentOpen = Session.get('menuOpen');
    Session.set('menuOpen', currentOpen === menuName ? null : menuName);
    tpl.manager.focusCurrentLayerCanvas();
  },

  // Close menu after selecting submenu item
  'click .submenu li:not(.sep):not(.spacer)'(e, tpl) {
    Meteor.setTimeout(() => {
      Session.set('menuOpen', null);
      tpl.manager.focusCurrentLayerCanvas();
    }, 150);
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
    if (window.confirm('Are you sure you want to remove the last layer?')) {
      Session.set('activeLayer', tpl.manager.removeLayer());
    }
  },
  'keydown'(e, tpl) {
    if (e.shiftKey && e.keyCode === 84) tpl.manager.toggleLayer();
  },

  // Brush events with state updates
  'click .js-brush-1'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'lines', brushSize: 2 });
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 2 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 2);
  },
  'click .js-brush-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'lines', brushSize: 3 });
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 3 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 3);
  },
  'click .js-brush-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'lines', brushSize: 15 });
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 15 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 15);
  },
  'click .js-brush-4'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'lines', brushSize: 100 });
    tpl.manager.setBrush(tpl.manager.brushes.lines, { maxSize: 100 });
    Session.set('activeBrush', 'lines');
    Session.set('activeBrushSize', 100);
  },
  'click .js-shaky-1'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'shaky', brushSize: 3 });
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 3 });
    Session.set('activeBrush', 'shaky');
    Session.set('activeBrushSize', 3);
  },
  'click .js-shaky-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'shaky', brushSize: 10 });
    tpl.manager.setBrush(tpl.manager.brushes.shaky, { maxSize: 10 });
    Session.set('activeBrush', 'shaky');
    Session.set('activeBrushSize', 10);
  },
  'click .js-calligraphy-1'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'calligraphy', brushSize: 3 });
    tpl.manager.setBrush(tpl.manager.brushes.calligraphy, { maxSize: 3 });
    Session.set('activeBrush', 'calligraphy');
    Session.set('activeBrushSize', 3);
  },
  'click .js-calligraphy-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'calligraphy', brushSize: 10 });
    tpl.manager.setBrush(tpl.manager.brushes.calligraphy, { maxSize: 10 });
    Session.set('activeBrush', 'calligraphy');
    Session.set('activeBrushSize', 10);
  },
  'click .js-calligraphy-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'calligraphy', brushSize: 25 });
    tpl.manager.setBrush(tpl.manager.brushes.calligraphy, { maxSize: 25 });
    Session.set('activeBrush', 'calligraphy');
    Session.set('activeBrushSize', 25);
  },
  'click .js-nebula-1'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'nebula', brushSize: 5 });
    tpl.manager.setBrush(tpl.manager.brushes.nebula, { maxSize: 5 });
    Session.set('activeBrush', 'nebula');
    Session.set('activeBrushSize', 5);
  },
  'click .js-nebula-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'nebula', brushSize: 15 });
    tpl.manager.setBrush(tpl.manager.brushes.nebula, { maxSize: 15 });
    Session.set('activeBrush', 'nebula');
    Session.set('activeBrushSize', 15);
  },
  'click .js-nebula-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'nebula', brushSize: 30 });
    tpl.manager.setBrush(tpl.manager.brushes.nebula, { maxSize: 30 });
    Session.set('activeBrush', 'nebula');
    Session.set('activeBrushSize', 30);
  },
  'click .js-ballpoint-1'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'paper', brushSize: 1 });
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 1 });
    Session.set('activeBrush', 'paper');
    Session.set('activeBrushSize', 1);
  },
  'click .js-ballpoint-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'paper', brushSize: 3 });
    tpl.manager.setBrush(tpl.manager.brushes.paper, { maxSize: 3 });
    Session.set('activeBrush', 'paper');
    Session.set('activeBrushSize', 3);
  },
  'click .js-ballpoint-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) sel.applyStyle({ brush: 'paper', brushSize: 10 });
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

  // Color events
  'click .js-color'(e, tpl) {
    const { color } = e.currentTarget.dataset;
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) {
      sel.applyStyle({ color });
    }
    Session.set('activeColor', color);
    tpl.manager.setColor(color);
  },
  'input .js-color-picker'(e, tpl) {
    const color = e.currentTarget.value;
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) {
      sel.previewStyle({ color });
    }
    Session.set('activeColor', color);
    tpl.manager.setColor(color);
  },

  // Selection style preview on hover
  'mouseenter .js-brush-1, mouseenter .js-brush-2, mouseenter .js-brush-3, mouseenter .js-brush-4'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const classList = e.currentTarget.className;
    let brushSize;
    if (classList.includes('js-brush-1')) brushSize = 2;
    else if (classList.includes('js-brush-2')) brushSize = 3;
    else if (classList.includes('js-brush-3')) brushSize = 15;
    else if (classList.includes('js-brush-4')) brushSize = 100;

    sel.previewStyle({ brush: 'lines', brushSize });
  },
  'mouseenter .js-ballpoint-1, mouseenter .js-ballpoint-2, mouseenter .js-ballpoint-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const classList = e.currentTarget.className;
    let brushSize;
    if (classList.includes('js-ballpoint-1')) brushSize = 1;
    else if (classList.includes('js-ballpoint-2')) brushSize = 3;
    else if (classList.includes('js-ballpoint-3')) brushSize = 10;

    sel.previewStyle({ brush: 'paper', brushSize });
  },
  'mouseenter .js-shaky-1, mouseenter .js-shaky-2'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const classList = e.currentTarget.className;
    let brushSize;
    if (classList.includes('js-shaky-1')) brushSize = 3;
    else if (classList.includes('js-shaky-2')) brushSize = 10;

    sel.previewStyle({ brush: 'shaky', brushSize });
  },
  'mouseenter .js-calligraphy-1, mouseenter .js-calligraphy-2, mouseenter .js-calligraphy-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const classList = e.currentTarget.className;
    let brushSize;
    if (classList.includes('js-calligraphy-1')) brushSize = 3;
    else if (classList.includes('js-calligraphy-2')) brushSize = 10;
    else if (classList.includes('js-calligraphy-3')) brushSize = 25;

    sel.previewStyle({ brush: 'calligraphy', brushSize });
  },
  'mouseenter .js-nebula-1, mouseenter .js-nebula-2, mouseenter .js-nebula-3'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const classList = e.currentTarget.className;
    let brushSize;
    if (classList.includes('js-nebula-1')) brushSize = 5;
    else if (classList.includes('js-nebula-2')) brushSize = 15;
    else if (classList.includes('js-nebula-3')) brushSize = 30;

    sel.previewStyle({ brush: 'nebula', brushSize });
  },
  'mouseenter .js-color'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (!sel?.hasSelection()) return;

    const { color } = e.currentTarget.dataset;
    sel.previewStyle({ color });
  },
  'mouseleave .submenu'(e, tpl) {
    const sel = tpl.manager.selectionLayer;
    if (sel?.hasSelection()) {
      sel.revertPreview();
    }
  },

  'click .js-toggle-culling'(e, tpl) {
    Session.set('cullingEnabled', !Session.get('cullingEnabled'));
    tpl.manager.focusCurrentLayerCanvas();
  },
});
