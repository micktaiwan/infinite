import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

BlazeLayout.setRoot('body');

FlowRouter.route('/book/:bookId', {
  name: 'book',
  action(params, queryParams) {
    BlazeLayout.render('layout', { main: 'layers' });
  },
});

FlowRouter.route('/', {
  name: 'home',
  action(params, queryParams) {
    BlazeLayout.render('layout', { main: 'home' });
  },
});
