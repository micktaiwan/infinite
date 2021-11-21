import LayerManager from './layerManager';

import './layers.html';

Template.layers.onRendered(function () {
  this.manager = new LayerManager();
  Session.set('layers', this.manager.getLayers());
  Session.set('activeLayer', 0);
});

Template.layers.helpers({
  layers() {
    return Session.get('layers');
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
    const index = +this;
    tpl.manager.focus(index);
    Session.set('activeLayer', index);
  },
  'click .js-add-layer'(e, tpl) {
    tpl.manager.addLayer();
    const layers = tpl.manager.getLayers();
    Session.set('layers', layers);
    Session.set('activeLayer', layers.length - 1);
  },
});
