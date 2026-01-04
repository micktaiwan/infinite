import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { BlazeLayout } from 'meteor/pwix:blaze-layout';

BlazeLayout.setRoot('body');

FlowRouter.route('/book/:bookId', {
  name: 'book',
  action(params, queryParams) {
    BlazeLayout.render('layout', { main: 'book' });
  },
});

FlowRouter.route('/', {
  name: 'home',
  action(params, queryParams) {
    BlazeLayout.render('layout', { main: 'home' });
  },
});
