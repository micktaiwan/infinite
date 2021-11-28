import { Template } from 'meteor/templating';
import './routes';
import './home';
import './book';
import './layout.html';

Template.registerHelper('log', text => console.log(text));
Template.registerHelper('add', (v, nb) => v + nb);
