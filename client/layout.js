import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
// import { ReactiveVar } from 'meteor/reactive-var';
import './routes';
import './home';
import './book';
import './layout.html';

Template.registerHelper('log', text => console.log(text));
Template.registerHelper('add', (v, nb) => v + nb);
