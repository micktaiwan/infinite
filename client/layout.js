import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';
import './routes';
import './home';
import './layers';
import './layout.html';

Template.registerHelper('log', text => console.log(text));
Template.registerHelper('add', (v, nb) => v + nb);
